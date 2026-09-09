import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { IndexedTriangleGeometry } from '../wall-thickness/wall-thickness-analysis';
import { OverhangReport } from './overhang-analysis';

export function createOverhangHeatmap(
  geometry: IndexedTriangleGeometry,
  report: OverhangReport,
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
  const flagged = new Set(
    report.faces.filter((face) => face.flagged).map((face) => face.triangle),
  );
  const risk = new Color('#c83232');
  const normal = new Color('#16726b');
  for (let triangle = 0; triangle < geometry.indices.length / 3; triangle++) {
    const color = flagged.has(triangle) ? risk : normal;
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
