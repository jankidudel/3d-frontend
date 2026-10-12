import {
  analyseParts,
  closeLargestAreas,
  exportParts,
  faceCoordinates,
  parsePartStl,
  PartEncoding,
  PartLimits,
  rankedParts,
  type PartMesh,
} from './disconnected-parts';
import {
  asciiFixture,
  binaryFixture,
  cubeTriangles,
  demoTriangles,
  tetraTriangles,
} from './parts-fixtures';
const mesh = (values: number[]): PartMesh => ({
  positions: new Float64Array(values),
  encoding: PartEncoding.Ascii,
});
function subdivide(values: number[], times: number): number[] {
  for (let iteration = 0; iteration < times; iteration++) {
    const next: number[] = [];
    for (let offset = 0; offset < values.length; offset += 9) {
      const a = values.slice(offset, offset + 3),
        b = values.slice(offset + 3, offset + 6),
        c = values.slice(offset + 6, offset + 9);
      const ab = a.map((v, i) => (v + b[i]) / 2),
        bc = b.map((v, i) => (v + c[i]) / 2),
        ca = c.map((v, i) => (v + a[i]) / 2);
      next.push(
        ...a,
        ...ab,
        ...ca,
        ...ab,
        ...b,
        ...bc,
        ...ca,
        ...bc,
        ...c,
        ...ab,
        ...bc,
        ...ca,
      );
    }
    values = next;
  }
  return values;
}
describe('exact edge-connected STL pieces', () => {
  it('recognises triangle soup and indexed copies with repeated coordinate triples and signed zeros', () => {
    const values = cubeTriangles().map((v, i) => (v === 0 && i % 2 ? -0 : v));
    const soup = mesh(values);
    const indexed = {
      ...soup,
      indices: Uint32Array.from({ length: values.length / 3 }, (_, i) => i),
    };
    expect(analyseParts(soup).parts).toHaveLength(1);
    expect(analyseParts(indexed).parts).toHaveLength(1);
    expect(analyseParts(soup).parts[0]).toMatchObject({
      area: 2400,
      triangles: 12,
      bounds: { spans: [20, 20, 20] },
    });
  });
  for (const encoding of [PartEncoding.Ascii, PartEncoding.Binary]) {
    it(`reopens ${encoding} retained cube and conserves faces, exact winding and original location`, async () => {
      const values = demoTriangles();
      const bytes =
        encoding === PartEncoding.Ascii
          ? new TextEncoder().encode(asciiFixture(values)).buffer
          : binaryFixture(values);
      const original = parsePartStl(bytes);
      const analysis = analyseParts(original);
      expect(analysis.parts).toHaveLength(3);
      expect(analysis.parts.map((p) => p.triangles)).toEqual([12, 4, 4]);
      expect(analyseParts(original).faceParts).toEqual(analysis.faceParts);
      const retained = parsePartStl(
        await (await exportParts(original, analysis, [1, 2])).arrayBuffer(),
      );
      expect(Array.from(retained.positions)).toEqual(cubeTriangles());
      expect(analyseParts(retained).bounds).toMatchObject({
        min: [0, 0, 0],
        max: [20, 20, 20],
      });
      expect(retained.positions.length / 9 + 8).toBe(analysis.triangles);
      for (let face = 0; face < 12; face++) {
        expect(faceCoordinates(retained, face)).toEqual(
          faceCoordinates(original, face),
        );
      }
      const all = parsePartStl(
        await (await exportParts(original, analysis, [])).arrayBuffer(),
      );
      expect(Array.from(all.positions)).toEqual(Array.from(original.positions));
    });
  }
  it('retains ASCII precision when coordinates differ below Float32 resolution', async () => {
    const values = [
      ...cubeTriangles(1, [1, 0, 0]),
      ...cubeTriangles(1, [2.000000001, 0, 0]),
    ];
    const original = parsePartStl(
      new TextEncoder().encode(asciiFixture(values)).buffer,
    );
    const analysis = analyseParts(original);
    expect(analysis.parts).toHaveLength(2);
    const output = parsePartStl(
      await (await exportParts(original, analysis, [0])).arrayBuffer(),
    );
    expect(Array.from(output.positions)).toEqual(values.slice(108));
  });
  it('uses area rather than tessellation and deterministic tie-breakers', () => {
    const original = mesh([
      ...cubeTriangles(20),
      ...subdivide(cubeTriangles(2, [30, 0, 0]), 4),
    ]);
    const result = analyseParts(original);
    expect(result.parts.map((p) => p.triangles)).toEqual([12, 3072]);
    expect(rankedParts(result)[0].id).toBe(0);
    const equal = analyseParts(
      mesh([...cubeTriangles(), ...cubeTriangles(20, [30, 0, 0])]),
    );
    expect(closeLargestAreas(equal)).toBe(true);
    expect(rankedParts(equal).map((p) => p.id)).toEqual([0, 1]);
    const ties = analyseParts(
      mesh([
        ...cubeTriangles(),
        ...subdivide(cubeTriangles(20, [30, 0, 0]), 1),
      ]),
    );
    expect(rankedParts(ties)[0].id).toBe(1);
  });
  it('keeps point contact, a real gap, intersecting shells and nested cavity surfaces separate', () => {
    for (const second of [
      cubeTriangles(10, [20, 20, 20]),
      cubeTriangles(10, [20.001, 0, 0]),
      cubeTriangles(10, [5, 5, 5]),
      cubeTriangles(20, [10, 10, 10]),
    ]) {
      expect(
        analyseParts(mesh([...cubeTriangles(), ...second])).parts,
      ).toHaveLength(2);
    }
  });
  it('handles open and non-manifold complete shared edges without a volume claim', () => {
    expect(
      analyseParts(mesh(cubeTriangles().slice(18))).parts[0].triangles,
    ).toBe(10);
    const result = analyseParts(
      mesh([...cubeTriangles(), ...cubeTriangles().slice(0, 9)]),
    );
    expect(result.parts[0].triangles).toBe(13);
    expect(result.parts[0]).not.toHaveProperty('volume');
    const edgeFan = mesh([
      0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
      -1, 0,
    ]);
    expect(analyseParts(edgeFan).parts).toHaveLength(1);
  });
  it('exports a manually removed middle-sized part without removing any other faces', async () => {
    const original = mesh([
      ...cubeTriangles(),
      ...tetraTriangles(4, [30, 0, 0]),
      ...tetraTriangles(2, [40, 0, 0]),
    ]);
    const result = analyseParts(original);
    const output = parsePartStl(
      await (await exportParts(original, result, [1])).arrayBuffer(),
    );
    expect(Array.from(output.positions)).toEqual([
      ...cubeTriangles(),
      ...tetraTriangles(2, [40, 0, 0]),
    ]);
    await expect(exportParts(original, result, [0, 1, 2])).rejects.toThrow(
      'Keep at least',
    );
    await expect(exportParts(original, result, [-1])).rejects.toThrow(
      'Invalid part',
    );
    await expect(exportParts(original, result, [9])).rejects.toThrow(
      'Invalid part',
    );
  });
  it('rejects degenerate faces and bad coordinates/indices without silent deletion', () => {
    expect(() =>
      analyseParts(mesh([...cubeTriangles(), 0, 0, 0, 0, 0, 0, 1, 0, 0])),
    ).toThrow('Zero-area');
    expect(() => analyseParts(mesh([0, 0, 0, 1, 0, 0, 2, 0, 0]))).toThrow(
      'Zero-area',
    );
    expect(() => analyseParts(mesh([NaN, 0, 0, 1, 0, 0, 0, 1, 0]))).toThrow(
      'invalid',
    );
    expect(() =>
      analyseParts({
        ...mesh(cubeTriangles()),
        indices: new Uint32Array([0, 1, 999]),
      }),
    ).toThrow('invalid vertex');
    expect(() => analyseParts(mesh([1, 2, 3]))).toThrow('complete triangles');
  });
  it('rejects malformed/truncated binary and excessive counts before allocating heavy structures', () => {
    const bytes = binaryFixture(cubeTriangles());
    expect(() => parsePartStl(bytes.slice(0, -1))).toThrow('Malformed');
    const excessive = new ArrayBuffer(84);
    new DataView(excessive).setUint32(80, 0xffffffff, true);
    expect(() => parsePartStl(excessive)).toThrow('Malformed');
    expect(() => parsePartStl(new ArrayBuffer(26 * 1024 * 1024))).toThrow(
      '25 MiB',
    );
    expect(() =>
      analyseParts({
        positions: new Float32Array(9),
        indices: new Uint32Array((PartLimits.Triangles + 1) * 3),
        encoding: PartEncoding.Binary,
      }),
    ).toThrow('complete triangles');
    expect(() =>
      parsePartStl(
        new TextEncoder().encode('solid x\nfacet normal 0 0 0\nendsolid x')
          .buffer,
      ),
    ).toThrow('Malformed');
  });
  it('keeps IDs stable for many pieces with bounded progress reports', () => {
    const many = mesh(
      Array.from({ length: 1000 }, (_, i) =>
        cubeTriangles(1, [i * 3, 0, 0]),
      ).flat(),
    );
    const progress: number[] = [];
    const result = analyseParts(many, (percent) => progress.push(percent));
    expect(result.parts).toHaveLength(1000);
    expect(result.triangles).toBe(12000);
    expect(result.parts[999].id).toBe(999);
    expect(progress.at(-1)).toBe(100);
    expect(progress.length).toBeLessThan(10);
  });
});
