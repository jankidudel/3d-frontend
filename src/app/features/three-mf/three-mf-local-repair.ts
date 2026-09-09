import { strToU8, unzipSync, zipSync } from 'fflate';
import {
  readThreeMfPackageInfo,
  resolveThreeMfWallGeometry,
  type ResolvedThreeMfGeometry,
} from '../shared/wall-thickness/three-mf-wall-thickness';

export interface ThreeMfRepairCounts {
  readonly triangles: number;
  readonly degenerateTriangles: number;
  readonly duplicateTriangles: number;
  readonly invalidIndexTriangles: number;
  readonly openEdges: number;
  readonly nonManifoldEdges: number;
  readonly inconsistentWindingEdges: number;
}

export interface ThreeMfRepairPlan {
  readonly removeDegenerateTriangles: boolean;
  readonly removeDuplicateTriangles: boolean;
  readonly removeInvalidIndexTriangles: boolean;
}

export interface ThreeMfRepairAnalysis {
  readonly packageInfo: ReturnType<typeof readThreeMfPackageInfo>;
  readonly resolved: ResolvedThreeMfGeometry;
  readonly counts: ThreeMfRepairCounts;
  readonly source: Uint8Array;
}

export interface ThreeMfRepairResult {
  readonly bytes: Uint8Array;
  readonly before: ThreeMfRepairAnalysis;
  readonly after: ThreeMfRepairAnalysis;
  readonly applied: Readonly<{
    degenerateTriangles: number;
    duplicateTriangles: number;
    invalidIndexTriangles: number;
  }>;
}

type Vertex = readonly [number, number, number];
type Triangle = {
  readonly source: string;
  readonly a: number;
  readonly b: number;
  readonly c: number;
};

const RELATIONSHIP_MODEL_TYPE = /\/3dmodel$/i;
const ATTRIBUTE = /\b([\w:-]+)\s*=\s*["']([^"']*)["']/g;

/**
 * Conservative browser-only repair. ZIP parts other than the relationship-selected
 * model XML remain byte-for-byte payloads; only removable triangle elements change.
 */
export async function analyseThreeMfForRepair(
  data: ArrayBuffer | Uint8Array,
): Promise<ThreeMfRepairAnalysis> {
  const source = data instanceof Uint8Array ? data : new Uint8Array(data);
  const packageInfo = readThreeMfPackageInfo(
    source.slice().buffer as ArrayBuffer,
  );
  const modelPath = modelPartPath(source);
  const files = unzipSync(source);
  const model = files[modelPath];
  if (!model) {
    throw new Error('unsupported-package');
  }
  const counts = inspectModelXml(new TextDecoder().decode(model));
  const resolved = await resolveThreeMfWallGeometry(
    source.slice().buffer as ArrayBuffer,
  );
  return { packageInfo, resolved, counts, source };
}

export async function repairThreeMfLocally(
  before: ThreeMfRepairAnalysis,
  plan: ThreeMfRepairPlan,
): Promise<ThreeMfRepairResult> {
  const files = unzipSync(before.source);
  const modelPath = modelPartPath(before.source);
  const model = files[modelPath];
  if (!model) {
    throw new Error('unsupported-package');
  }
  const rewritten = rewriteModelXml(new TextDecoder().decode(model), plan);
  if (
    rewritten.applied.degenerateTriangles +
      rewritten.applied.duplicateTriangles +
      rewritten.applied.invalidIndexTriangles ===
    0
  ) {
    throw new Error('no-supported-repair');
  }
  files[modelPath] = strToU8(rewritten.xml);
  const bytes = zipSync(files, { level: 6 });
  const after = await analyseThreeMfForRepair(bytes);
  return { bytes, before, after, applied: rewritten.applied };
}

export function defaultRepairPlan(
  counts: ThreeMfRepairCounts,
): ThreeMfRepairPlan {
  return {
    removeDegenerateTriangles: counts.degenerateTriangles > 0,
    removeDuplicateTriangles: counts.duplicateTriangles > 0,
    removeInvalidIndexTriangles: counts.invalidIndexTriangles > 0,
  };
}

function modelPartPath(source: Uint8Array): string {
  const files = unzipSync(source);
  const relationships = files['_rels/.rels'];
  if (!relationships) {
    throw new Error('unsupported-package');
  }
  const xml = new TextDecoder().decode(relationships);
  const relationship = /<Relationship\b([^>]*)\/?\s*>/gi;
  for (const match of xml.matchAll(relationship)) {
    const attributes = attributesOf(match[1]);
    if (!RELATIONSHIP_MODEL_TYPE.test(attributes.get('Type') ?? '')) {
      continue;
    }
    const target = attributes
      .get('Target')
      ?.replace(/\\/g, '/')
      .replace(/^\/+/, '');
    if (
      !target ||
      target.includes('..') ||
      /^[a-z][a-z0-9+.-]*:/i.test(target)
    ) {
      break;
    }
    return target;
  }
  throw new Error('unsupported-package');
}

function inspectModelXml(xml: string): ThreeMfRepairCounts {
  let triangles = 0;
  let degenerateTriangles = 0;
  let duplicateTriangles = 0;
  let invalidIndexTriangles = 0;
  const edgeUses = new Map<string, boolean[]>();
  for (const mesh of meshes(xml)) {
    const vertices = verticesFor(mesh);
    const seen = new Set<string>();
    for (const triangle of trianglesFor(mesh)) {
      triangles++;
      if (!inRange(triangle, vertices.length)) {
        invalidIndexTriangles++;
        continue;
      }
      if (
        degenerate(
          vertices[triangle.a],
          vertices[triangle.b],
          vertices[triangle.c],
        )
      ) {
        degenerateTriangles++;
        continue;
      }
      const key = [triangle.a, triangle.b, triangle.c]
        .sort((a, b) => a - b)
        .join(':');
      if (seen.has(key)) {
        duplicateTriangles++;
        continue;
      }
      seen.add(key);
      addEdges(edgeUses, triangle);
    }
  }
  let openEdges = 0,
    nonManifoldEdges = 0,
    inconsistentWindingEdges = 0;
  for (const uses of edgeUses.values()) {
    if (uses.length === 1) {
      openEdges++;
    } else if (uses.length > 2) {
      nonManifoldEdges++;
    } else if (uses[0] === uses[1]) {
      inconsistentWindingEdges++;
    }
  }
  return {
    triangles,
    degenerateTriangles,
    duplicateTriangles,
    invalidIndexTriangles,
    openEdges,
    nonManifoldEdges,
    inconsistentWindingEdges,
  };
}

function rewriteModelXml(
  xml: string,
  plan: ThreeMfRepairPlan,
): {
  xml: string;
  applied: {
    degenerateTriangles: number;
    duplicateTriangles: number;
    invalidIndexTriangles: number;
  };
} {
  const applied = {
    degenerateTriangles: 0,
    duplicateTriangles: 0,
    invalidIndexTriangles: 0,
  };
  const rewritten = xml.replace(
    /<mesh\b[^>]*>([\s\S]*?)<\/mesh\s*>/gi,
    (whole, body: string) => {
      const vertices = verticesFor(body);
      const seen = new Set<string>();
      return whole.replace(/<triangle\b[^>]*\/?\s*>/gi, (source: string) => {
        const triangle = triangleFor(source);
        if (!inRange(triangle, vertices.length)) {
          if (plan.removeInvalidIndexTriangles) {
            applied.invalidIndexTriangles++;
            return '';
          }
          return source;
        }
        if (
          degenerate(
            vertices[triangle.a],
            vertices[triangle.b],
            vertices[triangle.c],
          )
        ) {
          if (plan.removeDegenerateTriangles) {
            applied.degenerateTriangles++;
            return '';
          }
          return source;
        }
        const key = [triangle.a, triangle.b, triangle.c]
          .sort((a, b) => a - b)
          .join(':');
        if (seen.has(key)) {
          if (plan.removeDuplicateTriangles) {
            applied.duplicateTriangles++;
            return '';
          }
          return source;
        }
        seen.add(key);
        return source;
      });
    },
  );
  return { xml: rewritten, applied };
}

function meshes(xml: string): string[] {
  const result = [...xml.matchAll(/<mesh\b[^>]*>([\s\S]*?)<\/mesh\s*>/gi)].map(
    (match) => match[1],
  );
  if (result.length === 0) {
    throw new Error('unsupported-package');
  }
  return result;
}
function verticesFor(xml: string): Vertex[] {
  const result: Vertex[] = [];
  for (const match of xml.matchAll(/<vertex\b([^>]*)\/?\s*>/gi)) {
    const attributes = attributesOf(match[1]);
    const [x, y, z] = ['x', 'y', 'z'].map((key) => Number(attributes.get(key)));
    if (![x, y, z].every(Number.isFinite)) {
      throw new Error('unsupported-package');
    }
    result.push([x, y, z]);
  }
  return result;
}
function trianglesFor(xml: string): Triangle[] {
  return [...xml.matchAll(/<triangle\b[^>]*\/?\s*>/gi)].map((match) =>
    triangleFor(match[0]),
  );
}
function triangleFor(source: string): Triangle {
  const attributes = attributesOf(source);
  const values = ['v1', 'v2', 'v3'].map((key) => Number(attributes.get(key)));
  if (!values.every(Number.isInteger)) {
    throw new Error('unsupported-package');
  }
  return { source, a: values[0], b: values[1], c: values[2] };
}
function attributesOf(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of source.matchAll(ATTRIBUTE)) {
    attributes.set(match[1], match[2]);
  }
  return attributes;
}
function inRange(triangle: Triangle, count: number): boolean {
  return [triangle.a, triangle.b, triangle.c].every(
    (index) => index >= 0 && index < count,
  );
}
function degenerate(a: Vertex, b: Vertex, c: Vertex): boolean {
  const ab: Vertex = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    ac: Vertex = [c[0] - a[0], c[1] - a[1], c[2] - a[2]],
    bc: Vertex = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const cross: Vertex = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  const area = dot(cross, cross),
    longest = Math.max(dot(ab, ab), dot(ac, ac), dot(bc, bc));
  return longest === 0 || area <= 1e-12 * longest * longest;
}
function dot(a: Vertex, b: Vertex): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function addEdges(edges: Map<string, boolean[]>, triangle: Triangle): void {
  for (const [a, b] of [
    [triangle.a, triangle.b],
    [triangle.b, triangle.c],
    [triangle.c, triangle.a],
  ]) {
    const forward = a < b;
    const key = forward ? `${a}:${b}` : `${b}:${a}`;
    const uses = edges.get(key) ?? [];
    uses.push(forward);
    edges.set(key, uses);
  }
}
