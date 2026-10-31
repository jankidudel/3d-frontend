import { describe, expect, it } from 'vitest';
import {
  MeasurementType as T,
  MeasurementState as S,
  MeasurementFormat as F,
  SelectionBasis as B,
  calculateMeasurement as calculate,
  createMeasurementEntry,
  serializeMeasurements,
  type Point3,
} from './measurement';
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Plane,
  Vector3,
  DoubleSide,
} from 'three';
import { pickMeasurement } from './measurement-picking';
describe('measurement calculation and source/unit record', () => {
  it('retains existing 30-40-50 distance and distinguishes physical interpretation from display conversion', () => {
    expect(
      calculate(T.Distance, [
        [0, 0, 0],
        [30, 40, 0],
      ]),
    ).toMatchObject({ state: S.Available, distance: 50, delta: [30, 40, 0] });
    const points = [
      { coordinates: [0, 0, 0] as Point3, basis: B.Vertex },
      { coordinates: [1, 0, 0] as Point3, basis: B.Vertex },
    ];
    const context = {
      format: F.Stl,
      offset: [100, 50, 20] as Point3,
      declaredUnit: 'not declared',
    };
    const mm = createMeasurementEntry(
      'a',
      '<script>♥ Łódź</script>',
      T.Distance,
      points,
      context,
      'mm',
      'mm',
    );
    const inch = createMeasurementEntry(
      'a',
      mm.name,
      T.Distance,
      points,
      context,
      'in',
      'mm',
    );
    const converted = createMeasurementEntry(
      'a',
      mm.name,
      T.Distance,
      points,
      context,
      'in',
      'in',
    );
    expect(mm.result.distance! * mm.coordinateToMm!).toBe(1);
    expect(inch.result.distance! * inch.coordinateToMm!).toBe(25.4);
    expect(converted.result).toEqual(inch.result);
    expect(converted.displayedLengthUnit).toBe('in');
    const unknown = createMeasurementEntry(
      'a',
      'unknown',
      T.Distance,
      points,
      context,
      '',
      'mm',
    );
    expect(unknown.coordinateToMm).toBeNull();
    const exported = JSON.parse(serializeMeasurements([inch]));
    expect(exported.entries[0].name).toBe(mm.name);
    expect(exported.entries[0].points).toEqual(points);
    expect(exported).not.toHaveProperty('filename');
  });
  it('defines B as angle vertex, accepts 0/90/180, rejects repeated/nonfinite/unresolved legs and retains valid unknown-unit angles', () => {
    for (const [a, c, expected] of [
      [[1, 0, 0], [2, 0, 0], 0],
      [[1, 0, 0], [0, 1, 0], 90],
      [[-1, 0, 0], [1, 0, 0], 180],
    ] as const) {
      expect(calculate(T.Angle, [a, [0, 0, 0], c]).angleDegrees).toBeCloseTo(
        expected,
        12,
      );
    }
    expect(
      calculate(T.Angle, [
        [0, 0, 0],
        [0, 0, 0],
        [1, 0, 0],
      ]).state,
    ).toBe(S.Unavailable);
    expect(
      calculate(T.Angle, [
        [NaN, 0, 0],
        [0, 0, 0],
        [1, 0, 0],
      ]).state,
    ).toBe(S.Unavailable);
    expect(
      calculate(T.Angle, [
        [1e15, 0, 0],
        [1e15 + 1, 0, 0],
        [1e15, 1, 0],
      ]).state,
    ).toBe(S.Unavailable);
    const tilted: Point3[] = [
      [110, -40, 25],
      [100, -40, 25],
      [105, -40 + 3 * Math.sqrt(3), 25 + 4 * Math.sqrt(3)],
    ];
    expect(calculate(T.Angle, tilted).angleDegrees).toBeCloseTo(60, 10);
    const entry = createMeasurementEntry(
      'a',
      'a',
      T.Angle,
      tilted.map((coordinates) => ({ coordinates, basis: B.Entered })),
      { format: F.Stl, offset: [0, 0, 0], declaredUnit: 'unknown' },
      '',
      'mm',
    );
    expect(entry.result.angleDegrees).toBeCloseTo(60, 10);
    expect(entry.coordinateToMm).toBeNull();
  });
  it('constructs a 3D circle independent of order and uniform scale and rejects unstable inputs', () => {
    const base: Point3[] = [
      [10, 0, 0],
      [0, 6, 8],
      [-10, 0, 0],
    ];
    for (const scale of [1e-9, 1, 1e9]) {
      const points = base.map(
        (p) => p.map((v) => v * scale) as unknown as Point3,
      );
      const result = calculate(T.Circle, points);
      expect(result.radius! / scale).toBeCloseTo(10, 10);
      expect(
        calculate(T.Circle, [points[2], points[1], points[0]]).radius,
      ).toBe(result.radius);
    }
    const shifted = base.map((p) => p.map((v) => v + 1e9) as unknown as Point3);
    expect(calculate(T.Circle, shifted).radius).toBeCloseTo(10, 8);
    for (const points of [
      [
        [0, 0, 0],
        [0, 0, 0],
        [1, 0, 0],
      ],
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ],
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 1e-9, 0],
      ],
      [
        [0, 0, 0],
        [Infinity, 1, 0],
        [0, 1, 0],
      ],
    ] as Point3[][]) {
      expect(calculate(T.Circle, points).state).toBe(S.Unavailable);
    }
    expect(
      calculate(T.Circle, [
        [10, 0, 0],
        [0, 5, 0],
        [-10, 0, 0],
      ]).diameter,
    ).toBe(25);
    expect(
      calculate(T.Circle, [
        [10, 0, 0],
        [0, 5, 0],
        [0, -5, 0],
      ]).diameter,
    ).toBeCloseTo(12.5, 12);
  });
});
describe('unassigned 3MF coordinate provenance', () => {
  it('keeps cross-item scope unknown instead of claiming one placement', () => {
    const entry = createMeasurementEntry(
      'manual',
      'Manual coordinates',
      T.Distance,
      [
        { coordinates: [10, 20, 30], basis: B.Entered },
        { coordinates: [50, 20, 30], basis: B.Entered },
      ],
      { format: F.ThreeMf, offset: [0, 0, 0], declaredUnit: 'centimeter' },
      'mm',
      'mm',
    );
    expect(entry.result.distance).toBe(40);
    expect(entry.spansPlacedItems).toBeNull();
    expect(entry.placedItemIds).toEqual([]);
  });
});

describe('actual bounded measurement raycasting', () => {
  const rect = { left: 0, top: 0, width: 600, height: 600 };
  function fixture(indexed: boolean) {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3),
    );
    if (indexed) {
      geometry.setIndex([0, 1, 2]);
    }
    const mesh = new Mesh(
      geometry,
      new MeshBasicMaterial({ side: DoubleSide }),
    );
    mesh.position.set(2, 3, 0);
    mesh.name = 'reference-mesh';
    mesh.userData['placedItemId'] = 'placement-2';
    const group = new Group();
    group.add(mesh);
    const camera = new PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(2, 3, 6);
    camera.lookAt(2, 3, 0);
    camera.updateMatrixWorld();
    return { mesh, group, camera };
  }
  it('selects transformed indexed/nonindexed vertices with references; camera changes do not change stored coordinates', () => {
    for (const indexed of [false, true]) {
      const { mesh, group, camera } = fixture(indexed);
      for (const cameraZ of [6, 7]) {
        camera.position.z = cameraZ;
        camera.updateMatrixWorld();
        const screen = new Vector3(2, 4, 0).project(camera);
        const x = (screen.x + 1) * 300,
          y = (1 - screen.y) * 300 + 2;
        const pick = pickMeasurement(
          group,
          camera,
          rect,
          x,
          y,
          false,
          [10, 20, 30],
        );
        expect(pick.candidates[0]).toMatchObject({
          coordinates: [12, 24, 30],
          basis: B.Vertex,
          placedItemId: 'placement-2',
          vertexIndex: 2,
          faceIndex: 0,
          meshId: mesh.name,
        });
      }
    }
  });
  it('does not fall back to surface when the targeted face has no nearby vertex', () => {
    const { group, camera } = fixture(true);
    const pick = pickMeasurement(
      group,
      camera,
      rect,
      300,
      300,
      false,
      [0, 0, 0],
    );
    expect(pick.surface?.basis).toBe(B.Surface);
    expect(pick.candidates).toEqual([]);
  });
  it('rejects hidden ancestors, clipping and occluded vertices and excludes overlay lines', () => {
    const { group, mesh, camera } = fixture(true);
    group.visible = false;
    expect(
      pickMeasurement(group, camera, rect, 300, 300, false, [0, 0, 0]).surface,
    ).toBeNull();
    group.visible = true;
    mesh.material.clippingPlanes = [new Plane(new Vector3(0, 0, 1), -1)];
    expect(
      pickMeasurement(group, camera, rect, 300, 300, false, [0, 0, 0]).surface,
    ).toBeNull();
    mesh.material.clippingPlanes = [];
    const blocker = new Mesh(
      new BufferGeometry().setAttribute(
        'position',
        new Float32BufferAttribute([1, 3, 1, 3, 3, 1, 2, 5, 1], 3),
      ),
      new MeshBasicMaterial({ side: DoubleSide }),
    );
    group.add(blocker);
    const screen = new Vector3(2, 4, 0).project(camera);
    const pick = pickMeasurement(
      group,
      camera,
      rect,
      (screen.x + 1) * 300,
      (1 - screen.y) * 300 + 2,
      true,
      [0, 0, 0],
    );
    expect(pick.candidates.every((p) => p.meshId !== 'reference-mesh')).toBe(
      true,
    );
  });
});
