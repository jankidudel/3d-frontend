import { unzipSync } from 'fflate';
import { Matrix4, Vector3 } from 'three';
import {
  IndexedTriangleGeometry,
  WallThicknessUnit,
} from './wall-thickness-analysis';

const UNIT_TO_WALL_UNIT: Readonly<Record<string, WallThicknessUnit>> = {
  millimeter: WallThicknessUnit.Millimetres,
  centimeter: WallThicknessUnit.Centimetres,
  inch: WallThicknessUnit.Inches,
};
const MILLIMETRES_PER_3MF_UNIT: Readonly<Record<string, number>> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
};

export interface ResolvedThreeMfGeometry {
  readonly geometry: IndexedTriangleGeometry;
  readonly declaredUnit: string;
  readonly displayUnit: WallThicknessUnit;
  readonly extent: number;
}

/** Uses ThreeMFLoader's resolved build scene, including components and transforms. */
export async function resolveThreeMfWallGeometry(
  data: ArrayBuffer,
): Promise<ResolvedThreeMfGeometry> {
  const [{ ThreeMFLoader }, three] = await Promise.all([
    import('three/examples/jsm/loaders/3MFLoader.js'),
    import('three'),
  ]);
  const group = new ThreeMFLoader().parse(data);
  group.updateMatrixWorld(true);
  const declaredUnit = readDeclaredUnit(data);
  const unitScale = MILLIMETRES_PER_3MF_UNIT[declaredUnit];
  if (!unitScale) {
    throw new Error('unsupported-unit');
  }
  const positions: number[] = [];
  const indices: number[] = [];
  const point = new Vector3();
  group.traverse((child) => {
    const mesh = child as import('three').Mesh;
    if (!mesh.isMesh || !mesh.geometry) {
      return;
    }
    const position = mesh.geometry.getAttribute('position');
    if (!position) {
      return;
    }
    const start = positions.length / 3;
    const transform = new Matrix4().copy(mesh.matrixWorld);
    for (let vertex = 0; vertex < position.count; vertex++) {
      point
        .set(
          position.getX(vertex),
          position.getY(vertex),
          position.getZ(vertex),
        )
        .applyMatrix4(transform)
        .multiplyScalar(unitScale);
      positions.push(point.x, point.y, point.z);
    }
    const index = mesh.geometry.index;
    for (let face = 0; face < (index?.count ?? position.count); face += 3) {
      indices.push(
        start + (index ? index.getX(face) : face),
        start + (index ? index.getX(face + 1) : face + 1),
        start + (index ? index.getX(face + 2) : face + 2),
      );
    }
  });
  if (indices.length === 0 || indices.length % 3 !== 0) {
    throw new Error('unresolved-build');
  }
  const bounds = new three.Box3().setFromArray(positions);
  return {
    geometry: {
      positions: new Float32Array(positions),
      indices: new Uint32Array(indices),
    },
    declaredUnit,
    displayUnit:
      UNIT_TO_WALL_UNIT[declaredUnit] ?? WallThicknessUnit.Millimetres,
    extent: Math.max(bounds.getSize(new Vector3()).length(), 1),
  };
}

export function readDeclaredUnit(data: ArrayBuffer): string {
  try {
    const files = unzipSync(new Uint8Array(data));
    const modelFile = Object.keys(files).find((path) =>
      /^3D\/[^/]*\.model$/i.test(path),
    );
    if (!modelFile) {
      return 'millimeter';
    }
    const xml = new TextDecoder().decode(files[modelFile]);
    return (
      /<model\b[^>]*\bunit\s*=\s*["']([^"']+)["']/i
        .exec(xml)?.[1]
        .toLowerCase() ?? 'millimeter'
    );
  } catch {
    return 'millimeter';
  }
}
