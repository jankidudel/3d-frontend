import { analyseParts, parsePartStl } from './disconnected-parts';
import { binaryFixture, demoTriangles } from './parts-fixtures';
import { partThumbnails, PartThumbnailLimits } from './part-thumbnails';

describe('sampled piece identification thumbnails', () => {
  it('maps distinct bounded shapes to stable component IDs without changing source coordinates', () => {
    const mesh = parsePartStl(binaryFixture(demoTriangles()));
    const analysis = analyseParts(mesh);
    const before = Array.from(
      { length: analysis.triangles },
      (_, i) => analysis.faceParts[i],
    );
    const paths = partThumbnails(mesh, analysis);
    expect(paths).toHaveLength(3);
    expect(new Set(paths).size).toBe(2); // The two tetrahedra have the same shape at different scales.
    for (const [id, path] of paths.entries()) {
      expect(path.match(/M/g)).toHaveLength(
        Math.min(analysis.parts[id].triangles, PartThumbnailLimits.PerPart),
      );
      const values = path.match(/-?\d+\.\d+/g)!.map(Number);
      expect(
        values.every(
          (value) => Number.isFinite(value) && value >= 6 && value <= 94,
        ),
      ).toBe(true);
    }
    expect(partThumbnails(mesh, analysis)).toEqual(paths);
    expect(Array.from(analysis.faceParts)).toEqual(before);
  });
  it('caps samples for a dense component', () => {
    const triangles = Array.from({ length: 100 }, () =>
      demoTriangles().slice(0, 108),
    ).flat();
    const mesh = parsePartStl(binaryFixture(triangles));
    const analysis = analyseParts(mesh);
    expect(partThumbnails(mesh, analysis)[0].match(/M/g)).toHaveLength(
      PartThumbnailLimits.PerPart,
    );
  });
});
