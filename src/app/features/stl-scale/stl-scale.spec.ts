import { readStl, writeBinaryStl } from '../stl-reducer/stl-reducer';
import {
  dimensionsOf,
  percentageScale,
  scaleDimensions,
  scaleMesh,
  ScaleUnit,
  targetDimensionScale,
  unitConversionScale,
} from './stl-scale';

const ASCII_STL = `solid tetrahedron
facet normal 0 0 0
outer loop
vertex 0 0 0
vertex 10 0 0
vertex 0 20 0
endloop
endfacet
facet normal 0 0 0
outer loop
vertex 0 0 0
vertex 0 20 0
vertex 0 0 30
endloop
endfacet
endsolid tetrahedron\n`;

describe('STL scale tool', () => {
  it('reads ASCII and binary STL inputs', async () => {
    const ascii = await readStl(new File([ASCII_STL], 'model.stl'));
    const binary = await readStl(
      new File([writeBinaryStl(ascii)], 'model.stl'),
    );
    expect(ascii.encoding).toBe('ASCII STL');
    expect(binary.encoding).toBe('binary STL');
  });

  it('scales uniformly about the bounding-box centre without changing triangles', async () => {
    const source = await readStl(new File([ASCII_STL], 'model.stl'));
    const scaled = scaleMesh(source, 0.5)!;
    expect(scaled.indices.length).toBe(source.indices.length);
    expect(dimensionsOf(scaled)).toEqual({ width: 5, depth: 10, height: 15 });
  });

  it('calculates percentage, target-dimension, and unit conversion factors', () => {
    expect(percentageScale(75)).toBe(0.75);
    expect(
      targetDimensionScale(
        { width: 40, depth: 20, height: 10 },
        'width',
        2,
        ScaleUnit.Inches,
      ),
    ).toBeCloseTo(1.27);
    expect(unitConversionScale(ScaleUnit.Inches, ScaleUnit.Millimetres)).toBe(
      25.4,
    );
    expect(
      unitConversionScale(ScaleUnit.Centimetres, ScaleUnit.Inches),
    ).toBeCloseTo(10 / 25.4);
    expect(
      scaleDimensions(
        { width: 40, depth: 20, height: 10 },
        1.27,
        ScaleUnit.Inches,
      ),
    ).toEqual({ width: 2, depth: 1, height: 0.5 });
  });

  it('rejects zero, negative, NaN, and infinite scaling values', async () => {
    const source = await readStl(new File([ASCII_STL], 'model.stl'));
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(percentageScale(value)).toBeNull();
      expect(scaleMesh(source, value)).toBeNull();
    }
    expect(
      targetDimensionScale(
        { width: 1, depth: 1, height: 1 },
        'width',
        0,
        ScaleUnit.Millimetres,
      ),
    ).toBeNull();
  });
});
