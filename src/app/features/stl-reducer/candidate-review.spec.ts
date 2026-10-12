import { displayNumber } from '../../shared/numeric-display';
import { checkGeometry, ModelUnits } from '../repeat-workflows/mesh-workflows';
import {
  reviewedCandidate,
  ReductionMethod,
  regressions,
  comparisonLimit,
} from './candidate-review';
import { readStl, writeBinaryStl } from './stl-reducer';
import { exampleFile, MeshExample } from '../repeat-workflows/example-meshes';
import { geometryBounds } from '../shared/wall-thickness/three-mf-wall-thickness';
describe('exact candidate bytes', () => {
  it('reopens a 12-triangle cube with independently specified bytes and bounds', async () => {
    const file = exampleFile(MeshExample.Cube);
    const before = new Uint8Array(await file.arrayBuffer());
    const original = await readStl(file);
    const output = await reviewedCandidate(
      original,
      ReductionMethod.Encoding,
      100,
    );
    expect(output.blob.size).toBe(684);
    expect(output.mesh.indices.length / 3).toBe(12);
    expect(output.bounds).toEqual({
      min: [0, 0, 0],
      max: [20, 20, 20],
      spans: [20, 20, 20],
    });
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(before);
    const repeated = await reviewedCandidate(
      output.mesh,
      ReductionMethod.Encoding,
      100,
    );
    expect(repeated.blob.size).toBe(684);
    expect(new Uint8Array(await repeated.blob.arrayBuffer())).toEqual(
      new Uint8Array(await output.blob.arrayBuffer()),
    );
    expect(output.regressions).toEqual([]);
  });
  it('starts each requested target from unchanged original geometry', async () => {
    const original = await readStl(exampleFile(MeshExample.Cube));
    const indices = original.indices.slice();
    const positions = original.positions.slice();
    const a = await reviewedCandidate(original, ReductionMethod.Reduction, 75);
    const b = await reviewedCandidate(original, ReductionMethod.Reduction, 50);
    expect(a.requestedTriangles).toBe(9);
    expect(b.requestedTriangles).toBe(6);
    expect(original.indices).toEqual(indices);
    expect(original.positions).toEqual(positions);
    expect(new Uint8Array(await b.blob.arrayBuffer())).toEqual(
      new Uint8Array(await writeBinaryStl(b.mesh).arrayBuffer()),
    );
  });
  it('preserves a deliberate 3 mm move and blocks nonfinite STL data', async () => {
    const original = await readStl(exampleFile(MeshExample.Cube));
    const shifted = {
      ...original,
      positions: original.positions.map(
        (value, index) => value + (index % 3 === 0 ? 3 : 0),
      ),
    };
    const output = await reviewedCandidate(
      shifted,
      ReductionMethod.Encoding,
      100,
    );
    expect(geometryBounds(output.mesh)).toEqual({
      min: [3, 0, 0],
      max: [23, 20, 20],
      spans: [20, 20, 20],
    });
    const bad = await writeBinaryStl({
      ...original,
      positions: original.positions.map(() => Infinity),
    }).arrayBuffer();
    await expect(readStl(new File([bad], 'bad.stl'))).rejects.toThrow(
      /nonfinite/,
    );
    await expect(readStl(new File([], 'empty.stl'))).rejects.toThrow(/empty/);
  });
  it('marks limits and unavailable topology honestly', async () => {
    const original = await readStl(exampleFile(MeshExample.Cube));
    expect(comparisonLimit(6 * 1024 * 1024, 684, original, original)).toContain(
      'unavailable',
    );
    expect(regressions(null, null)).toEqual([]);
  });
  it('keeps the actual printer boundary failure when the coordinate displays equal', async () => {
    const original = await readStl(exampleFile(MeshExample.Cube));
    const positions = original.positions.map((value, index) =>
      index % 3 === 0 && value === 20 ? Math.fround(20.00001) : value,
    );
    const result = checkGeometry(
      { ...original, positions },
      {
        stlUnit: ModelUnits.Millimetres,
        printer: {
          name: 'Independent 20-coordinate envelope',
          dimensions: [20, 20, 20],
        },
        thicknessThresholdMm: 1.2,
      },
    );
    expect(displayNumber(result.dimensionsMm.width)).toBe('20');
    expect(result.dimensionsMm.width).toBeGreaterThan(20);
    expect(result.fit).toBe(false);
    expect(JSON.parse(JSON.stringify(result)).dimensionsMm.width).toBe(
      Math.fround(20.00001),
    );
  });
});
