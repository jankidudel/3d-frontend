import type {
  IndexedTriangleGeometry,
  WallThicknessReport,
} from './wall-thickness-model';
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';

import {
  WallThicknessHeatmapColour,
  classifyWallThicknessSample,
} from './wall-thickness-legend';

export {
  classifyWallThicknessSample,
  WallThicknessHeatmapColour,
  WallThicknessSampleClass,
  wallThicknessLegend,
} from './wall-thickness-legend';

/** Creates a display-only colour mesh and does not mutate analysed geometry. */
export function createWallThicknessHeatmap(
  geometry: IndexedTriangleGeometry,
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
