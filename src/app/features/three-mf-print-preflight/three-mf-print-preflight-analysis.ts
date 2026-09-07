import {
  MeshIntegrityReport,
  PreflightAction,
  PreflightStatus,
  preflightStatus,
} from '../stl-print-preflight/stl-print-preflight-analysis';

export const THREE_MF_WALL_THICKNESS_LIMITATION =
  'This is a sampled normal-direction screen of the resolved build. It does not replace slicer, material, load or printer-specific requirements.';

export function threeMfPreflightStatus(
  integrity: MeshIntegrityReport,
  thinAreas: boolean,
  fitsPrinter: boolean,
  packageWarning: boolean,
): PreflightStatus {
  const status = preflightStatus(integrity, thinAreas, fitsPrinter);
  if (packageWarning && status === 'No issue found in this check') {
    return 'Check before slicing';
  }
  return status;
}

export function threeMfPreflightActions(
  integrity: MeshIntegrityReport,
  thinAreas: boolean,
  fitsPrinter: boolean,
  triangleCount: number,
): readonly PreflightAction[] {
  const actions: PreflightAction[] = [];
  if (
    integrity.openEdges ||
    integrity.nonManifoldEdges ||
    integrity.degenerateTriangles ||
    integrity.duplicateTriangles
  ) {
    actions.push({
      label: 'Review 3MF Repair',
      route: '/3mf-repair',
      reason:
        'Repair only the findings it can correct safely, then rerun this preflight.',
    });
  }
  if (!fitsPrinter) {
    actions.push({
      label: 'Check dimensions and printer fit',
      route: '/3mf-dimensions-checker',
      reason:
        'Review the final build size and tested right-angle orientations.',
    });
  }
  if (thinAreas) {
    actions.push({
      label: 'Inspect wall thickness',
      route: '/3mf-wall-thickness-checker',
      reason:
        'Review sampled thin regions using the intended printer and material.',
    });
  }
  if (triangleCount > 500000) {
    actions.push({
      label: 'Review triangle complexity',
      route: '/3mf-triangle-counter',
      reason:
        'A dense resolved build can make slicers slower to open and prepare.',
    });
  }
  actions.push({
    label: 'Keep a geometry-only copy only when needed',
    route: '/3mf-to-stl-converter',
    reason:
      'Converting to STL loses 3MF package information such as units, build structure and metadata.',
  });
  return actions;
}
