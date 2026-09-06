import { metrics, readStl, writeBinaryStl } from './stl-reducer';

const ASCII_STL = `solid triangle
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 1 0 0
vertex 0 1 0
endloop
endfacet
endsolid triangle
`;

describe('STL reducer', () => {
  it('converts ASCII STL to binary without changing triangle count or geometry', async () => {
    const source = await readStl(new File([ASCII_STL], 'triangle.stl'));
    const output = writeBinaryStl(source);
    const converted = await readStl(new File([output], 'triangle.stl'));

    expect(source.encoding).toBe('ASCII STL');
    expect(converted.encoding).toBe('binary STL');
    expect(metrics(converted, output.size).triangleCount).toBe(1);
    expect(Array.from(converted.positions)).toEqual(
      Array.from(source.positions),
    );
  });

  it('reports local topology warnings for an open single triangle', async () => {
    const mesh = await readStl(new File([ASCII_STL], 'triangle.stl'));

    expect(metrics(mesh, ASCII_STL.length).warnings).toContain(
      'Open or non-manifold edges detected.',
    );
  });
});
