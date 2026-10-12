import {
  analyseParts,
  exportParts,
  parsePartStl,
} from '../src/app/features/stl-repair/disconnected-parts.ts';
import {
  binaryFixture,
  cubeTriangles,
} from '../src/app/features/stl-repair/parts-fixtures.ts';
/** Bundle with esbuild for Node; reports observed CPU time, not browser latency. */
for (const pieces of [1000, 10000, 40000]) {
  const values = Array.from({ length: pieces }, (_, index) =>
    cubeTriangles(1, [(index % 200) * 3, Math.floor(index / 200) * 3, 0]),
  ).flat();
  const bytes = binaryFixture(values);
  const started = performance.now();
  const mesh = parsePartStl(bytes);
  const parsed = performance.now();
  const analysis = analyseParts(mesh);
  const exporting = performance.now();
  const output = await exportParts(
    mesh,
    analysis,
    analysis.parts.slice(1).map((part) => part.id),
  );
  console.log(
    JSON.stringify({
      pieces,
      triangles: analysis.triangles,
      bytes: bytes.byteLength,
      parseMs: Math.round(parsed - started),
      connectivityMs: Math.round(analysis.milliseconds),
      verifiedExportMs: Math.round(performance.now() - exporting),
      retainedTriangles: 12,
      outputBytes: output.size,
    }),
  );
}
