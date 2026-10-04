import {
  checkGeometry,
  surfaceDifference,
  csvCell,
  ModelUnits,
  WorkflowLimits,
} from './mesh-workflows';
import { exampleMesh, MeshExample } from './example-meshes';
const settings = {
  stlUnit: ModelUnits.Millimetres,
  printer: {
    name: 'illustrative 30 mm bed',
    dimensions: [30, 30, 30] as const,
  },
  thicknessThresholdMm: 1.2,
};
describe('consistent mesh reports', () => {
  it('matches a closed cube ground truth and distinguishes skipped fit', () => {
    const result = checkGeometry(exampleMesh(), settings);
    expect(result.topology.volume).toBe(8000);
    expect(result.topology.shells).toBe(1);
    expect(result.fit).toBe(true);
    expect(
      checkGeometry(exampleMesh(), { ...settings, printer: null }).fit,
    ).toBeNull();
    expect(
      checkGeometry(exampleMesh(), settings, 25.4).dimensionsMm.width,
    ).toBe(508);
  });
  it('reports open, non-manifold, disconnected and degenerate fixtures independently', () => {
    expect(
      checkGeometry(exampleMesh(MeshExample.Open), settings).topology.openEdges,
    ).toBe(4);
    expect(
      checkGeometry(exampleMesh(MeshExample.Open), settings).topology.volume,
    ).toBeNull();
    expect(
      checkGeometry(exampleMesh(MeshExample.NonManifold), settings).topology
        .nonManifoldEdges,
    ).toBe(3);
    expect(
      checkGeometry(exampleMesh(MeshExample.Degenerate), settings).topology
        .degenerateTriangles,
    ).toBe(1);
    expect(
      checkGeometry(exampleMesh(MeshExample.Shells), settings).topology.shells,
    ).toBe(2);
    expect(
      checkGeometry(exampleMesh(MeshExample.Shells), settings).topology.volume,
    ).toBeNull();
    expect(() =>
      checkGeometry(
        {
          positions: new Float32Array([0, 0, 0]),
          indices: new Uint32Array([0, 1, 2]),
        },
        settings,
      ),
    ).toThrow();
    expect(() =>
      checkGeometry(
        {
          positions: new Float32Array([0, 0, 0]),
          indices: new Uint32Array((WorkflowLimits.Triangles + 1) * 3),
        },
        settings,
      ),
    ).toThrow();
  });
});
describe('triangle-surface comparison', () => {
  it('does not mistake retriangulation or face ordering for shape changes', () => {
    const cube = exampleMesh();
    const reordered = {
      ...cube,
      indices: new Uint32Array(Array.from(cube.indices).reverse()),
    };
    expect(
      surfaceDifference(
        cube,
        exampleMesh(MeshExample.Retriangulated),
        0.001,
        300,
      ).maximumSampledMm,
    ).toBeLessThan(0.00001);
    expect(
      surfaceDifference(cube, reordered, 0.001, 300).samplesOverTolerance,
    ).toBe(0);
  });
  it('detects known offsets and local surface changes without rescaling', () => {
    expect(
      surfaceDifference(
        exampleMesh(),
        exampleMesh(MeshExample.Offset),
        0.01,
        300,
      ).maximumSampledMm,
    ).toBeCloseTo(3, 2);
    expect(
      surfaceDifference(
        exampleMesh(),
        exampleMesh(MeshExample.Changed),
        0.01,
        300,
      ).maximumSampledMm,
    ).toBeCloseTo(4, 2);
  });
  it('protects CSV text from spreadsheet formula interpretation', () => {
    expect(csvCell('=HYPERLINK("evil")')).toBe('"\'=HYPERLINK(""evil"")"');
    expect(csvCell('normal,name')).toBe('"normal,name"');
  });
});
