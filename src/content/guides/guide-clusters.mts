import type { GuideCard } from '../../app/features/guides/guide-catalogue.ts';
import { GuideContentSlug } from './guides.registry.ts';

export interface GuideCluster {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly pillar: string;
  readonly slugs: readonly string[];
}

export interface GuideIndexCluster {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly pillar: string;
  readonly guides: readonly GuideCard[];
}

export const guideClusters: readonly GuideCluster[] = [
  {
    id: 'cad-export',
    label: 'CAD export and mesh interpretation',
    description:
      'Choose export settings and interpret the resulting surfaces and separate parts.',
    pillar: 'how-to-export-stl-from-cad',
    slugs: [
      'how-to-export-stl-from-cad',
      'stl-resolution-chord-height-explained',
      'stl-multiple-shells-disconnected-parts',
    ],
  },
  {
    id: 'repeat-workflows',
    label: 'Collections, revisions and customer files',
    description:
      'Keep a reproducible review when selling models or checking supplied files.',
    pillar: '3d-print-file-preflight-checklist',
    slugs: [
      'how-to-compare-stl-revisions',
      'check-stl-files-before-selling',
      'inspect-customer-supplied-print-files',
    ],
  },
  {
    id: 'filament-nozzles',
    label: 'Filament storage, nozzles and throughput',
    description:
      'Match the equipment decision to the actual material and planning task.',
    pillar: 'maximum-volumetric-speed-explained',
    slugs: [
      'filament-dryer-vs-dry-box',
      'brass-vs-hardened-nozzle',
      'maximum-volumetric-speed-explained',
    ],
  },
  {
    id: 'readiness',
    label: 'Print readiness and preflight',
    description:
      'Decide whether a model is ready for the next stage before slicing.',
    pillar: 'how-to-check-if-a-3d-model-is-ready-to-print',
    slugs: [
      'how-to-check-if-a-3d-model-is-ready-to-print',
      '3d-print-file-preflight-checklist',
      'how-to-make-an-stl-file-printable',
      'how-to-check-stl-for-errors',
      'how-inspectmesh-checks-files',
      'how-to-check-a-3mf-file-for-errors',
      'stl-file-wont-slice',
      'why-wont-my-3mf-file-slice',
    ],
  },
  {
    id: 'repair',
    label: 'STL diagnosis and repair',
    description:
      'Interpret mesh faults and choose a safe repair or source-CAD route.',
    pillar: 'how-to-repair-an-stl-file',
    slugs: [
      'how-to-repair-an-stl-file',
      'how-to-fix-holes-in-an-stl-file',
      'how-to-fix-non-manifold-stl',
      'how-to-fix-flipped-normals-in-an-stl-file',
      'how-to-remove-duplicate-triangles-from-an-stl-file',
      'what-is-non-manifold-geometry',
      'self-intersecting-mesh-vs-non-manifold',
      'how-to-tell-if-an-stl-is-watertight',
    ],
  },
  {
    id: 'size',
    label: 'STL size, scale and complexity',
    description:
      'Measure, scale and simplify mesh files without losing the intended design.',
    pillar: 'how-to-scale-an-stl-file-for-3d-printing',
    slugs: [
      'how-to-scale-an-stl-file-for-3d-printing',
      'stl-scale-factor-explained',
      'why-stl-files-have-no-units',
      'stl-volume-calculation-wrong',
      'how-to-measure-3d-model',
      'stl-triangle-count-explained',
      'how-to-reduce-stl-triangle-count',
      'how-to-reduce-stl-file-size',
      'ascii-vs-binary-stl',
    ],
  },
  {
    id: '3mf',
    label: '3MF diagnosis and conversion',
    description:
      'Work with 3MF packages, build items, units and format conversion limits.',
    pillar: 'how-to-check-a-3mf-file-for-errors',
    slugs: [
      'how-to-open-a-3mf-file',
      '3mf-missing-objects-after-import',
      'how-to-repair-a-3mf-file',
      'how-to-tell-if-a-3mf-file-is-watertight',
      'how-to-tell-if-a-3mf-file-is-manifold',
      'how-to-check-3mf-triangle-count',
      'how-to-scale-a-3mf-file',
      '3mf-units-explained',
      'how-to-convert-stl-to-3mf',
      'how-to-convert-3mf-to-stl',
      'does-3mf-keep-colours-materials-and-settings',
    ],
  },
  {
    id: 'geometry',
    label: 'Wall thickness, orientation and printer fit',
    description:
      'Check practical geometry, bed fit and layout decisions before printing.',
    pillar: '3d-print-wall-thickness-guide',
    slugs: [
      '3d-print-wall-thickness-guide',
      'how-to-check-stl-wall-thickness-for-3d-printing',
      'how-to-check-3mf-wall-thickness-for-3d-printing',
      'how-to-check-if-a-3d-model-fits-your-printer',
      'how-to-rotate-a-3d-model-to-fit-your-printer',
      'how-to-orient-an-stl-file-for-3d-printing',
      'how-to-arrange-multiple-parts-on-a-3d-printer-bed',
      'how-to-split-an-stl-file-for-3d-printing',
      'how-to-inspect-stl-3mf-cross-sections',
      'how-to-hollow-an-stl-file-for-3d-printing',
    ],
  },
  {
    id: 'gcode',
    label: 'G-code inspection',
    description:
      'Open, navigate and inspect final G-code before committing a printer to a job.',
    pillar: 'how-to-check-gcode-before-printing',
    slugs: [
      'how-to-open-and-view-gcode-files',
      'how-to-check-gcode-before-printing',
    ],
  },
  {
    id: 'formats',
    label: 'Formats and file fundamentals',
    description:
      'Choose a delivery format and understand the roles of mesh and CAD files.',
    pillar: 'best-file-format-for-3d-printing',
    slugs: [
      GuideContentSlug.BestFileFormatFor3dPrinting,
      GuideContentSlug.ThreeMfVsStl,
      GuideContentSlug.StlVsObjFor3dPrinting,
      GuideContentSlug.StlVsStepFor3dPrinting,
      GuideContentSlug.WhatIsAnStlFile,
      GuideContentSlug.HowToOpenAnStlFile,
    ],
  },
  {
    id: 'cost',
    label: 'Cost, filament and quoting',
    description:
      'Estimate material, production cost and a transparent customer price.',
    pillar: 'how-to-calculate-3d-printing-cost',
    slugs: [
      'how-to-calculate-3d-printing-cost',
      '3d-print-batch-cost-per-part',
      '3d-print-support-and-purge-material-cost',
      '3d-print-labour-cost-and-post-processing',
      '3d-print-lead-time-vs-print-time',

      'how-much-to-charge-for-3d-prints',
      'how-much-filament-does-a-3d-print-use',
      'how-many-metres-in-1kg-filament',
      'how-to-estimate-filament-weight-from-a-3mf-file',
      'how-to-calculate-3mf-volume',
    ],
  },
  {
    id: 'calibration',
    label: 'Functional fit and calibration',
    description:
      'Calibrate a printer and validate dimensional results with controlled tests.',
    pillar: '3d-printer-calibration-guide',
    slugs: [
      '3d-printer-calibration-guide',
      '3d-print-flow-rate-vs-e-steps',
      '3d-print-hole-size-compensation',
      '3d-print-hole-orientation-and-accuracy',
      '3d-print-elephants-foot-and-part-fit',
      '3d-print-heat-set-insert-hole-sizing',
      '3d-print-snap-fit-clearance',

      'how-to-compensate-for-3d-print-shrinkage',
      '3d-print-tolerance-and-clearance-guide',
      '3d-print-overhangs-and-supports-guide',
    ],
  },
];

export function createGuideClusterIndex(
  guides: readonly GuideCard[],
): readonly GuideIndexCluster[] {
  const guideBySlug = new Map(guides.map((guide) => [guide.slug, guide]));
  const assignedSlugs = guideClusters.flatMap((cluster) => cluster.slugs);
  const duplicateSlug = assignedSlugs.find(
    (slug, index) => assignedSlugs.indexOf(slug) !== index,
  );
  if (duplicateSlug) {
    throw new Error(
      `Guide cluster validation failed: "${duplicateSlug}" appears in more than one cluster.`,
    );
  }
  const unassignedSlugs = guides
    .map((guide) => guide.slug)
    .filter((slug) => !assignedSlugs.includes(slug));
  if (unassignedSlugs.length > 0) {
    throw new Error(
      `Guide cluster validation failed: unassigned guides: ${unassignedSlugs.join(', ')}.`,
    );
  }
  const unknownSlugs = assignedSlugs.filter((slug) => !guideBySlug.has(slug));
  if (unknownSlugs.length > 0) {
    throw new Error(
      `Guide cluster validation failed: unknown guides: ${unknownSlugs.join(', ')}.`,
    );
  }
  return guideClusters.map((cluster) => ({
    id: cluster.id,
    label: cluster.label,
    description: cluster.description,
    pillar: cluster.pillar,
    guides: cluster.slugs.map((slug) => guideBySlug.get(slug)!),
  }));
}
