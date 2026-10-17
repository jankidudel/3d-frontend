import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Point = readonly [number, number, number];
type Face = readonly [Point, Point, Point];

const outputRoot = fileURLToPath(
  new URL('../public/examples/split-assembly/', import.meta.url),
);
mkdirSync(outputRoot, { recursive: true });
writeFileSync(
  `${outputRoot}generate-fixtures.mts`,
  readFileSync(import.meta.filename),
);

const quad = (a: Point, b: Point, c: Point, d: Point): readonly Face[] => [
  [a, b, c],
  [a, c, d],
];

function writeBinaryStl(name: string, faces: readonly Face[]): number {
  const bytes = new Uint8Array(84 + faces.length * 50);
  const header = new TextEncoder().encode(
    'InspectMesh owned analytical geometry - no physical fit claim',
  );
  bytes.set(header.slice(0, 80));
  const view = new DataView(bytes.buffer);
  view.setUint32(80, faces.length, true);
  faces.forEach((face, faceIndex) => {
    const [a, b, c] = face;
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const offset = 84 + faceIndex * 50;
    [...normal, ...a, ...b, ...c].forEach((value, valueIndex) => {
      view.setFloat32(offset + valueIndex * 4, value, true);
    });
  });
  writeFileSync(`${outputRoot}${name}`, bytes);
  return bytes.length;
}

function rectangularTube(): readonly Face[] {
  const faces: Face[] = [];
  const outer = (z: number): readonly Point[] => [
    [0, 0, z],
    [20, 0, z],
    [20, 20, z],
    [0, 20, z],
  ];
  const inner = (z: number): readonly Point[] => [
    [4, 4, z],
    [16, 4, z],
    [16, 16, z],
    [4, 16, z],
  ];
  for (let index = 0; index < 4; index += 1) {
    const next = (index + 1) % 4;
    faces.push(
      ...quad(outer(0)[next], outer(0)[index], inner(0)[index], inner(0)[next]),
      ...quad(
        outer(20)[index],
        outer(20)[next],
        inner(20)[next],
        inner(20)[index],
      ),
      ...quad(
        outer(0)[index],
        outer(0)[next],
        outer(20)[next],
        outer(20)[index],
      ),
      ...quad(
        inner(0)[next],
        inner(0)[index],
        inner(20)[index],
        inner(20)[next],
      ),
    );
  }
  return faces;
}

function matingBlock(openAtTop: boolean): readonly Face[] {
  const segmentCount = 24;
  const half = 10;
  const radius = 2.15;
  const socketDepth = 7;
  const outerBottom: Point[] = [];
  const outerTop: Point[] = [];
  const socketOpening: Point[] = [];
  const socketEnd: Point[] = [];
  for (let index = 0; index < segmentCount; index += 1) {
    const angle = (index * 2 * Math.PI) / segmentCount;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const boundaryScale = half / Math.max(Math.abs(cosine), Math.abs(sine));
    outerBottom.push([
      half + cosine * boundaryScale,
      half + sine * boundaryScale,
      0,
    ]);
    outerTop.push([
      half + cosine * boundaryScale,
      half + sine * boundaryScale,
      10,
    ]);
    socketOpening.push([
      half + cosine * radius,
      half + sine * radius,
      openAtTop ? 10 : 0,
    ]);
    socketEnd.push([
      half + cosine * radius,
      half + sine * radius,
      openAtTop ? 10 - socketDepth : socketDepth,
    ]);
  }

  const faces: Face[] = [];
  const bottomCentre: Point = [half, half, 0];
  const socketEndCentre: Point = [half, half, openAtTop ? 3 : 7];
  for (let index = 0; index < segmentCount; index += 1) {
    const next = (index + 1) % segmentCount;
    faces.push(
      ...quad(
        outerBottom[index],
        outerBottom[next],
        outerTop[next],
        outerTop[index],
      ),
    );
    if (openAtTop) {
      faces.push(
        [bottomCentre, outerBottom[next], outerBottom[index]],
        ...quad(
          outerTop[index],
          outerTop[next],
          socketOpening[next],
          socketOpening[index],
        ),
        ...quad(
          socketOpening[index],
          socketOpening[next],
          socketEnd[next],
          socketEnd[index],
        ),
        [socketEndCentre, socketEnd[index], socketEnd[next]],
      );
    }
  }

  if (openAtTop) {
    return faces;
  }
  return matingBlock(true).map(([a, b, c]) => [
    [a[0], a[1], 10 - a[2]],
    [c[0], c[1], 10 - c[2]],
    [b[0], b[1], 10 - b[2]],
  ]);
}

function dowel(): readonly Face[] {
  const faces: Face[] = [];
  const segments = 32;
  const radius = 2;
  const length = 12;
  const bottomCentre: Point = [0, 0, 0];
  const topCentre: Point = [0, 0, length];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index * 2 * Math.PI) / segments;
    const nextAngle = (((index + 1) % segments) * 2 * Math.PI) / segments;
    const a: Point = [radius * Math.cos(angle), radius * Math.sin(angle), 0];
    const b: Point = [
      radius * Math.cos(nextAngle),
      radius * Math.sin(nextAngle),
      0,
    ];
    const c: Point = [b[0], b[1], length];
    const d: Point = [a[0], a[1], length];
    faces.push(...quad(a, b, c, d), [bottomCentre, b, a], [topCentre, d, c]);
  }
  return faces;
}

const files = [
  {
    name: 'hollow-channel-20x20x20.stl',
    bytes: writeBinaryStl('hollow-channel-20x20x20.stl', rectangularTube()),
    geometry:
      'Closed rectangular tube: outer 20 x 20, inner passage 12 x 12, height 20 coordinate units.',
  },
  {
    name: 'alignment-block-a.stl',
    bytes: writeBinaryStl('alignment-block-a.stl', matingBlock(true)),
    geometry:
      '20 x 20 x 10 block with a 4.30-diameter blind socket, 7 deep, opening on +Z.',
  },
  {
    name: 'alignment-block-b.stl',
    bytes: writeBinaryStl('alignment-block-b.stl', matingBlock(false)),
    geometry:
      '20 x 20 x 10 block with a 4.30-diameter blind socket, 7 deep, opening on -Z.',
  },
  {
    name: 'alignment-dowel.stl',
    bytes: writeBinaryStl('alignment-dowel.stl', dowel()),
    geometry: 'Separate 4.00-diameter, 12-long, 32-sided dowel.',
  },
];

const source = {
  licence: 'Original InspectMesh analytical geometry; attribution requested.',
  unit: 'coordinate units; examples use an explicit millimetre assumption',
  physicalTest: false,
  generatedBy: 'scripts/generate-split-assembly-fixtures.mts',
  coupon: {
    block: [20, 20, 10],
    socketDiameter: 4.3,
    socketDepth: 7,
    dowelDiameter: 4,
    dowelLength: 12,
    intendedSeamGap: 0.2,
    intendedEngagementPerSide: 5.9,
    endClearancePerSocket: 1.1,
    assemblyTranslations: {
      blockA: [0, 0, 0],
      blockB: [0, 0, 10.2],
      dowel: [10, 10, 4.1],
    },
  },
  hollowChannel: {
    outside: [20, 20, 20],
    passage: [12, 12, 20],
    analyticMaterialVolume: 5120,
    analyticHalfVolumeAtZ10: 2560,
  },
  files,
};
writeFileSync(
  `${outputRoot}manifest.json`,
  `${JSON.stringify(source, null, 2).replace(
    /\[\n\s+(-?\d+(?:\.\d+)?),\n\s+(-?\d+(?:\.\d+)?),\n\s+(-?\d+(?:\.\d+)?)\n\s+\]/g,
    '[$1, $2, $3]',
  )}\n`,
);
