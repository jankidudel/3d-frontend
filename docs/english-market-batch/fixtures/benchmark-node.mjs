import { pathToFileURL } from 'node:url';
const { checkGeometry, surfaceDifference, ModelUnits } = await import(
  pathToFileURL(process.argv[2]).href
);
const { exampleMesh } = await import(pathToFileURL(process.argv[3]).href);
import { writeFileSync } from 'node:fs';
const cube = exampleMesh();
const settings = {
  stlUnit: ModelUnits.Millimetres,
  printer: null,
  thicknessThresholdMm: 1.2,
};
const records = [];
for (const triangles of [1200, 12000, 99996]) {
  const positions = new Float32Array((triangles / 12) * 24);
  const indices = new Uint32Array(triangles * 3);
  for (let i = 0; i < triangles / 12; i++) {
    positions.set(
      cube.positions.map((value, j) => (j % 3 === 0 ? value + i * 25 : value)),
      i * 24,
    );
    indices.set(
      cube.indices.map((value) => value + i * 8),
      i * 36,
    );
  }
  const mesh = { positions, indices };
  const before = process.memoryUsage();
  const started = performance.now();
  const result = checkGeometry(mesh, settings);
  const durationMs = performance.now() - started;
  const compareStarted = performance.now();
  const comparison = surfaceDifference(mesh, mesh, 0.01);
  records.push({
    triangles,
    binaryStlBytes: 84 + triangles * 50,
    checkDurationMs: durationMs,
    compareDurationMs: performance.now() - compareStarted,
    processMemoryBefore: before,
    processMemoryAfter: process.memoryUsage(),
    wallSamples: result.thickness?.samples,
    maximumSampledMm: comparison.maximumSampledMm,
  });
}
writeFileSync(
  process.argv[4],
  JSON.stringify(
    {
      date: '2026-10-04',
      runtime: process.version,
      platform: process.platform,
      arch: process.arch,
      note: 'Node process observations, not browser heap or a promise for every device. Disjoint owned cube array stress fixture.',
      records,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  records.map(({ triangles, checkDurationMs, compareDurationMs }) => ({
    triangles,
    checkDurationMs,
    compareDurationMs,
  })),
);
