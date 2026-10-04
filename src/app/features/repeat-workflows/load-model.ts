import { WorkflowLimits, ModelUnits } from './mesh-workflows';
import type { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-analysis';
export interface LoadedModel {
  mesh: IndexedTriangleGeometry;
  unit: string;
  scale: number;
  warnings: readonly string[];
}
export async function loadWorkflowModel(
  file: File,
  unit: ModelUnits,
): Promise<LoadedModel> {
  if (!file.size || file.size > WorkflowLimits.FileBytes) {
    throw new Error(
      'Choose a nonempty STL or 3MF under the 5 MiB processing budget.',
    );
  }
  if (/\.stl$/i.test(file.name)) {
    const { readStl } = await import('../stl-reducer/stl-reducer');
    const mesh = await readStl(file);
    if (mesh.indices.length / 3 > WorkflowLimits.Triangles) {
      throw new Error(
        'This model exceeds the 100,000-triangle processing budget.',
      );
    }
    return {
      mesh,
      unit,
      scale: unit === ModelUnits.Inches ? 25.4 : 1,
      warnings: ['STL unit is an explicit assumption, not file metadata.'],
    };
  }
  if (!/\.3mf$/i.test(file.name)) {
    throw new Error('Choose an STL or a supported mesh-based 3MF file.');
  }
  const bytes = await file.arrayBuffer();
  const { unzipSync } = await import('fflate');
  let expandedBytes = 0;
  unzipSync(new Uint8Array(bytes), {
    filter: (entry) => {
      expandedBytes += entry.originalSize;
      if (expandedBytes > WorkflowLimits.ExpandedPackageBytes) {
        throw new Error('This 3MF exceeds the 20 MiB expanded-package budget.');
      }
      return false;
    },
  });
  const { resolveThreeMfWallGeometry } =
    await import('../shared/wall-thickness/three-mf-wall-thickness');
  const resolved = await resolveThreeMfWallGeometry(bytes);
  if (resolved.geometry.indices.length / 3 > WorkflowLimits.Triangles) {
    throw new Error(
      'This resolved build exceeds the 100,000-triangle processing budget.',
    );
  }
  return {
    mesh: resolved.geometry,
    unit: resolved.declaredUnit,
    scale: 1,
    warnings: [
      ...(!resolved.declaredUnitExplicitly
        ? ['No explicit package unit; the 3MF millimetre default was used.']
        : []),
      `${resolved.buildItemCount} build items resolved; scene transforms applied. Materials, slicer settings and unsupported package extensions are not validated.`,
    ],
  };
}
