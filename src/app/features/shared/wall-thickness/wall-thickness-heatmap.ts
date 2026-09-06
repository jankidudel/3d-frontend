import {
  ThicknessSample,
  WallThicknessReport,
} from './wall-thickness-analysis';
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';

export const WallThicknessSampleClass = {
  Below: 'below',
  Near: 'near',
  Above: 'above',
  Unmeasured: 'unmeasured',
} as const;
export type WallThicknessSampleClass =
  (typeof WallThicknessSampleClass)[keyof typeof WallThicknessSampleClass];

export const WallThicknessHeatmapColour: Record<
  WallThicknessSampleClass,
  string
> = {
  below: '#c83232',
  near: '#d98a18',
  above: '#16726b',
  unmeasured: '#7b8794',
};

export function classifyWallThicknessSample(
  sample: ThicknessSample,
  threshold: number,
): WallThicknessSampleClass {
  if (sample.thickness === null) {
    return WallThicknessSampleClass.Unmeasured;
  }
  if (sample.thickness < threshold) {
    return WallThicknessSampleClass.Below;
  }
  return sample.thickness < threshold * 1.25
    ? WallThicknessSampleClass.Near
    : WallThicknessSampleClass.Above;
}

export function wallThicknessLegend(report: WallThicknessReport): string {
  return `Red below ${report.threshold} ${report.unit}; orange/yellow close to threshold; blue/green comfortably above; grey unmeasured.`;
}

/** Creates a display-only colour mesh and does not mutate analysed geometry. */
export function createWallThicknessHeatmap(
  geometry: import('./wall-thickness-analysis').IndexedTriangleGeometry,
  report: WallThicknessReport,
): Group {
  const source = new BufferGeometry();
  source.setAttribute(
    'position',
    new Float32BufferAttribute(geometry.positions, 3),
  );
  source.setIndex(Array.from(geometry.indices));
  const expanded = source.toNonIndexed();
  source.dispose();
  const colors = new Float32Array(expanded.getAttribute('position').count * 3);
  const sampleByTriangle = new Map(
    report.samples.map((sample) => [sample.triangle, sample]),
  );
  for (let triangle = 0; triangle < geometry.indices.length / 3; triangle++) {
    const sample = sampleByTriangle.get(triangle) ?? {
      triangle,
      thickness: null,
    };
    const color = new Color(
      WallThicknessHeatmapColour[
        classifyWallThicknessSample(sample, report.threshold)
      ],
    );
    for (let vertex = 0; vertex < 3; vertex++) {
      const offset = (triangle * 3 + vertex) * 3;
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }
  }
  expanded.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const group = new Group();
  group.add(
    new Mesh(
      expanded,
      new MeshStandardMaterial({ vertexColors: true, roughness: 0.72 }),
    ),
  );
  return group;
}
