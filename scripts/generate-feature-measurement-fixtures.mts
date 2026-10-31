import { format } from 'prettier';
/** Original, deterministic mesh controls. Explicit regeneration only. */
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { zipSync, strToU8 } from 'fflate';
import {
  MeasurementType,
  MeasurementFormat,
  SelectionBasis,
  createMeasurementEntry,
  serializeMeasurements,
  calculateMeasurement,
  type Point3,
} from '../src/app/features/shared/feature-measurement/measurement.ts';
const directory = resolve(
  import.meta.dirname,
  '../public/examples/feature-measurement',
);
type Triangle = readonly [Point3, Point3, Point3];
export function binaryStl(triangles: readonly Triangle[]): Uint8Array {
  const bytes = new Uint8Array(84 + triangles.length * 50);
  const view = new DataView(bytes.buffer);
  view.setUint32(80, triangles.length, true);
  triangles.forEach((triangle, i) => {
    const [a, b, c] = triangle;
    const u = b.map((v, k) => v - a[k]),
      v = c.map((value, k) => value - a[k]);
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const magnitude = Math.hypot(...n);
    n.forEach((value, k) =>
      view.setFloat32(84 + i * 50 + k * 4, value / magnitude, true),
    );
    triangle.forEach((p, j) =>
      p.forEach((value, k) =>
        view.setFloat32(84 + i * 50 + 12 + j * 12 + k * 4, value, true),
      ),
    );
  });
  return bytes;
}
/** Each wedge is a closed triangular prism, used as a readable coupon. */
function prism(a: Point3, b: Point3, c: Point3): Triangle[] {
  const lower = (p: Point3): Point3 => [p[0], p[1], p[2] - 2];
  const A = lower(a),
    B = lower(b),
    C = lower(c);
  return [
    [a, b, c],
    [C, B, A],
    [a, A, B],
    [a, B, b],
    [b, B, C],
    [b, C, c],
    [c, C, A],
    [c, A, a],
  ];
}
function bore(n: number, ellipse = false): Triangle[] {
  const inner = Array.from({ length: n }, (_, i): Point3 => [
    10 * Math.cos((i * 2 * Math.PI) / n),
    (ellipse ? 5 : 10) * Math.sin((i * 2 * Math.PI) / n),
    0,
  ]);
  // Same 30 x 30 square outer boundary; radial intersection at each angle.
  const outer = inner.map((_, i): Point3 => {
    const angle = (i * 2 * Math.PI) / n,
      x = Math.cos(angle),
      y = Math.sin(angle),
      r = 15 / Math.max(Math.abs(x), Math.abs(y));
    return [r * x, r * y, 0];
  });
  const top = (p: Point3): Point3 => [p[0], p[1], 8];
  const triangles: Triangle[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n,
      a = inner[i],
      b = inner[j],
      A = outer[i],
      B = outer[j];
    triangles.push(
      [a, b, top(b)],
      [a, top(b), top(a)],
      [A, top(A), top(B)],
      [A, top(B), B],
      [top(a), top(b), top(B)],
      [top(a), top(B), top(A)],
      [a, B, b],
      [a, A, B],
    );
  }
  return triangles.map(([a, b, c]) => [a, c, b]);
}
export async function generateFeatureFixtures(): Promise<void> {
  await mkdir(directory, { recursive: true });
  const assets: { name: string; bytes: number; sha256: string }[] = [];
  const save = async (name: string, bytes: Uint8Array) => {
    await writeFile(resolve(directory, name), bytes);
    assets.push({
      name,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  };
  const points = {
    A: [10, 0, 0],
    B: [0, 0, 0],
    C: [5, 5 * Math.sqrt(3), 0],
    right: [0, 10, 0],
    opposite: [-10, 0, 0],
    distanceEnd: [30, 40, 0],
  } satisfies Record<string, Point3>;
  // Separate closed prisms keep the angle and 30-40-50 distance references easy to target.
  const coupon = prism(points.B, points.A, points.C);
  const tilt = (p: Point3): Point3 => [
    p[0] + 100,
    p[1] * 0.6 - p[2] * 0.8 - 40,
    p[1] * 0.8 + p[2] * 0.6 + 25,
  ];
  const variants = {
    'distance-coupon.stl': prism([0, 0, 0], [30, 0, 0], [30, 40, 0]),
    'angle-coupon.stl': coupon,
    'angle-coupon-tilted.stl': coupon.map(
      (t) => t.map(tilt) as unknown as Triangle,
    ),
    'angle-coupon-scaled.stl': coupon.map(
      (t) =>
        t.map(
          (p) => p.map((v) => v * 3) as unknown as Point3,
        ) as unknown as Triangle,
    ),
    'bore-12.stl': bore(12),
    'bore-48.stl': bore(48),
    'ellipse.stl': bore(48, true),
  };
  for (const [name, triangles] of Object.entries(variants)) {
    await save(name, binaryStl(triangles));
  }
  const mesh =
    '<mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/><vertex x="0" y="0" z="1"/></vertices><triangles><triangle v1="0" v2="2" v3="1"/><triangle v1="0" v2="1" v3="3"/><triangle v1="0" v2="3" v3="2"/><triangle v1="1" v2="2" v3="3"/></triangles></mesh>';
  const xml = `<?xml version="1.0"?><model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" unit="centimeter"><resources><object id="1" type="model">${mesh}</object></resources><build><item objectid="1" transform="0 2 0 -2 0 0 0 0 2 1 2 3"/><item objectid="1" transform="1 0 0 0 1 0 0 0 1 5 2 3"/></build></model>`;
  await save(
    'placed-centimetre.3mf',
    zipSync(
      {
        '[Content_Types].xml': strToU8(
          '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>',
        ),
        '_rels/.rels': strToU8(
          '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>',
        ),
        '3D/3dmodel.model': strToU8(xml),
      },
      { mtime: new Date('2026-10-31T00:00:00Z') },
    ),
  );
  const diagrams: Record<string, string> = {
    'angle.svg':
      '<path d="M100 230L400 230L250 50Z" fill="#dfedf9" stroke="#124976" stroke-width="3"/><path d="M160 230A60 60 0 0 0 130 178" fill="none" stroke="#a12b21" stroke-width="3"/><text x="60" y="260">B: vertex (0,0)</text><text x="370" y="260">A (10,0)</text><text x="210" y="32">C (5, 5√3)</text><text x="168" y="210">60°</text><text x="50" y="310">Ideal XY schematic; actual stored coordinates differ by Float32 rounding.</text>',
    'polygon.svg':
      '<circle cx="180" cy="170" r="110" fill="none" stroke="#ae3026"/><polygon points="' +
      Array.from(
        { length: 12 },
        (_, i) =>
          `${180 + 110 * Math.cos((i * Math.PI) / 6)},${170 + 110 * Math.sin((i * Math.PI) / 6)}`,
      ).join(' ') +
      '" fill="none" stroke="#124976" stroke-width="3"/><path d="M70 170H290" stroke="#ae3026"/><text x="340" y="90">Vertex circle: diameter 20</text><text x="340" y="140">12-gon flat span: 19.3185165</text><text x="340" y="190">48-gon flat span: 19.9571785</text><text x="340" y="240">Ideal sections, not physical fit.</text><text x="60" y="315">The viewer constructs a circle; it does not calculate the minimum passage.</text>',
    'ellipse.svg':
      '<ellipse cx="200" cy="140" rx="84" ry="42" fill="#dfedf9" stroke="#124976" stroke-width="3"/><circle cx="200" cy="203" r="105" fill="none" stroke="#ae3026"/><circle cx="231.5" cy="140" r="52.5" fill="none" stroke="#16723c"/><text x="385" y="105">Same 20 × 10 ellipse</text><text x="385" y="155">Three points: diameter 25</text><text x="385" y="205">Different three: diameter 12.5</text><text x="40" y="315">Analytical counterexample; neither circle establishes a round opening.</text>',
    'placement.svg':
      '<path d="M70 240L70 80L230 240Z M410 240L490 240L410 160Z" fill="#dfedf9" stroke="#124976" stroke-width="3"/><path d="M70 250H410" stroke="#ae3026" stroke-width="3"/><text x="60" y="55">Rotated/scaled placement</text><text x="390" y="130">Reused resource</text><text x="90" y="290">Build origins (10,20,30) and (50,20,30) mm: 40 mm apart.</text>',
  };
  for (const [name, body] of Object.entries(diagrams)) {
    await save(
      name,
      strToU8(
        `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340"><rect width="760" height="340" fill="white"/><g font-family="sans-serif" font-size="17" fill="#19354e">${body}</g></svg>`,
      ),
    );
  }
  const manifest = {
    version: 1,
    provenance:
      'Original InspectMesh deterministic software controls; no physical print tests.',
    generator: 'scripts/generate-feature-measurement-fixtures.mts',
    assets,
    points,
    coupon: {
      topZ: 0,
      distancePoints: [
        [0, 0, 0],
        [30, 40, 0],
      ],
      distance: 50,
      axisDifferences: [30, 40, 0],
      components: 1,
      tilt: '(x+100, .6y-.8z-40, .8y+.6z+25)',
      uniformScale: 3,
    },
    bores: [12, 48].map((sides) => ({
      sides,
      axis: 'Z',
      openingZ: [0, 8],
      outerBounds: [30, 30, 8],
      circumradius: 10,
      vertexAngles: '2*pi*i/n from +X',
      circlePoints: [0, sides / 4, sides / 2],
      idealDiameter: 20,
      idealFlatSpan: 20 * Math.cos(Math.PI / sides),
    })),
    ellipse: {
      spans: [20, 10],
      pointIndicesA: [0, 12, 24],
      pointIndicesB: [0, 12, 36],
      idealDiameters: [25, 12.5],
    },
    threeMf: {
      declaredUnit: 'centimeter',
      transforms: ['0 2 0 -2 0 0 0 0 2 1 2 3', '1 0 0 0 1 0 0 0 1 5 2 3'],
      expectedBuildOrigins: [
        [10, 20, 30],
        [50, 20, 30],
      ],
      crossItemDistanceMm: 40,
    },
    limits: [
      'A point reference is a mesh vertex, not an analytic CAD feature.',
      'Polygon inscribed spans are independent arithmetic, not viewer clearance results.',
    ],
  };

  // Reopen exact Float32 positions before running actual production calculations.
  const reopen = async (name: string, p: Point3): Promise<Point3> => {
    const bytes = await readFile(resolve(directory, name));
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const target = p.map(Math.fround);
    for (let face = 0; face < view.getUint32(80, true); face++) {
      for (let vertex = 0; vertex < 3; vertex++) {
        const stored = [0, 1, 2].map((axis) =>
          view.getFloat32(84 + face * 50 + 12 + vertex * 12 + axis * 4, true),
        ) as unknown as Point3;
        if (stored.every((v, i) => v === target[i])) {
          return stored;
        }
      }
    }
    throw new Error('Reference missing from serialized fixture');
  };
  const anglePoints = await Promise.all(
    [points.A, points.B, points.C].map((p) => reopen('angle-coupon.stl', p)),
  );
  const cardinal = (x: number, y: number, i: number): Point3 => [
    x * Math.cos((i * Math.PI) / 2),
    y * Math.sin((i * Math.PI) / 2),
    0,
  ];
  const b12 = await Promise.all(
    [0, 1, 2].map((i) => reopen('bore-12.stl', cardinal(10, 10, i))),
  );
  const b48 = await Promise.all(
    [0, 1, 2].map((i) => reopen('bore-48.stl', cardinal(10, 10, i))),
  );
  const ellipseA = await Promise.all(
    [0, 1, 2].map((i) => reopen('ellipse.stl', cardinal(10, 5, i))),
  );
  const ellipseB = await Promise.all(
    [0, 1, 3].map((i) => reopen('ellipse.stl', cardinal(10, 5, i))),
  );
  const entries = [
    createMeasurementEntry(
      'example-angle',
      'Angle coupon stored references',
      MeasurementType.Angle,
      anglePoints.map((coordinates) => ({
        coordinates,
        basis: SelectionBasis.Vertex,
      })),
      {
        format: MeasurementFormat.Stl,
        offset: [0, 0, 0],
        declaredUnit: 'not declared',
      },
      'mm',
      'mm',
    ),
    createMeasurementEntry(
      'example-ellipse-a',
      'Ellipse construction A',
      MeasurementType.Circle,
      ellipseA.map((coordinates) => ({
        coordinates,
        basis: SelectionBasis.Vertex,
      })),
      {
        format: MeasurementFormat.Stl,
        offset: [0, 0, 0],
        declaredUnit: 'not declared',
      },
      'mm',
      'mm',
    ),
  ];
  await save(
    'example-measurements.json',
    strToU8(await format(serializeMeasurements(entries), { parser: 'json' })),
  );
  const observations = {
    date: '2026-10-31',
    method:
      'Exact stored Float32 STL positions reopened, then actual calculateMeasurement. Browser interactions recorded separately.',
    angle: {
      points: anglePoints,
      result: calculateMeasurement(MeasurementType.Angle, anglePoints),
    },
    bore12: {
      points: b12,
      result: calculateMeasurement(MeasurementType.Circle, b12),
    },
    bore48: {
      points: b48,
      result: calculateMeasurement(MeasurementType.Circle, b48),
    },
    ellipseA: {
      points: ellipseA,
      result: calculateMeasurement(MeasurementType.Circle, ellipseA),
    },
    ellipseB: {
      points: ellipseB,
      result: calculateMeasurement(MeasurementType.Circle, ellipseB),
    },
  };
  await save(
    'observations.json',
    strToU8(await format(JSON.stringify(observations), { parser: 'json' })),
  );
  await save('generate-fixtures.mts', await readFile(import.meta.filename));
  // Captured UI evidence is immutable input, never regenerated or inferred.
  for (const name of (await readdir(directory))
    .filter((name) => name.startsWith('browser-') && name.endsWith('.json'))
    .sort()) {
    const bytes = await readFile(resolve(directory, name));
    assets.push({
      name,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  await writeFile(
    resolve(directory, 'manifest.json'),
    await format(JSON.stringify(manifest), { parser: 'json' }),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await generateFeatureFixtures();
}
