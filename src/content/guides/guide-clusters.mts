import {
  PublicRouteUrl,
  guideRoutePath,
} from '../../app/core/seo/public-routes.ts';
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
    id: 'reduction-review',
    label: 'STL encoding and candidate review',
    description:
      'Separate byte savings, Float32 representation and actual simplified surfaces before selecting a derivative.',
    pillar: 'how-to-reduce-stl-file-size',
    slugs: [
      'how-to-reduce-stl-file-size',
      'how-to-reduce-stl-triangle-count',
      'ascii-vs-binary-stl',
      GuideContentSlug.TruncatedStlFile,
      'stl-triangle-count-explained',
    ],
  },
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
    label: 'Material evidence, storage and throughput',
    description:
      'Read thermal, time and condition evidence, then match preparation and throughput to the job.',
    pillar: 'maximum-volumetric-speed-explained',
    slugs: [
      'filament-dryer-vs-dry-box',
      GuideContentSlug.ThreeDPrintHeatResistanceHdtVsTg,
      GuideContentSlug.ThreeDPrintCreepUnderSustainedLoad,
      GuideContentSlug.ThreeDPrintMoistureAndDimensionalStability,

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
      GuideContentSlug.EmbossedTextNotPrinting,
      GuideContentSlug.VaseModeVsNormalPrinting,
      GuideContentSlug.MissingTopLayersInSlicer,
      'floating-regions-in-slicer',
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
      GuideContentSlug.DegenerateTrianglesStl,
      'how-to-fix-holes-in-an-stl-file',
      'how-to-fix-non-manifold-stl',
      'how-to-fix-flipped-normals-in-an-stl-file',
      'how-to-remove-duplicate-triangles-from-an-stl-file',
      'what-is-non-manifold-geometry',
      'internal-faces-in-stl',
      'self-intersecting-mesh-vs-non-manifold',
      'how-to-tell-if-an-stl-is-watertight',
      'slicer-fills-hole-in-stl',
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
      'measure-angle-in-stl',
      'measure-hole-diameter-stl',
    ],
  },
  {
    id: '3mf',
    label: '3MF diagnosis and conversion',
    description:
      'Open supported geometry, trace placements and verify properties or conversion scope in the receiving application.',
    pillar: 'how-to-check-a-3mf-file-for-errors',
    slugs: [
      'extract-part-from-3mf',
      '3mf-to-stl-wrong-size-or-position',
      '3mf-to-stl-combined-or-separate-parts',
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
    label: 'Geometry, layers and support access',
    description:
      'Separate source geometry from layer, wall and infill decisions; compare orientation and support access before printing.',
    pillar: 'how-to-orient-an-stl-file-for-3d-printing',
    slugs: [
      GuideContentSlug.ThreeDPrintLayerHeightVsDetail,
      GuideContentSlug.ThreeDPrintWallsVsInfill,
      GuideContentSlug.ThreeDPrintZSeamPlacement,
      GuideContentSlug.ThreeDPrintIroningVsTopSurfacePattern,
      '3d-print-wall-thickness-guide',
      'how-to-check-stl-wall-thickness-for-3d-printing',
      'zero-thickness-stl-surface',
      'how-to-check-3mf-wall-thickness-for-3d-printing',
      'how-to-check-if-a-3d-model-fits-your-printer',
      'round-3d-printer-bed-fit',
      'brim-skirt-support-bed-space',
      'stl-model-off-build-plate',
      'how-to-rotate-a-3d-model-to-fit-your-printer',
      'how-to-orient-an-stl-file-for-3d-printing',
      GuideContentSlug.MirroredStlFile,
      'how-to-lay-an-stl-flat-on-print-bed',
      '3d-print-overhangs-and-supports-guide',
      '3d-print-bridge-vs-overhang',
      'supports-inside-holes-and-channels',
      'how-to-arrange-multiple-parts-on-a-3d-printer-bed',
      'how-to-split-an-stl-file-for-3d-printing',
      'stl-split-failed',
      'alignment-pins-for-split-3d-prints',
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
      GuideContentSlug.GcodeAbsoluteVsRelativeExtrusion,
      GuideContentSlug.GcodeFeedRateMmPerMinute,
      'gcode-outside-print-bed',
      'can-you-use-gcode-from-another-printer',
      'gcode-preview-incomplete',
      'sequential-3d-printing-clearance',
      'how-to-open-and-view-gcode-files',
      'how-to-check-gcode-before-printing',
    ],
  },
  {
    id: 'formats',
    label: 'Formats and file fundamentals',
    description:
      'Choose by required information, verify a complete appearance bundle and record the actual receiving-file check.',
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
      'Interpret available geometry volume, use complete sliced consumption and calculate production cost and customer price.',
    pillar: 'how-to-calculate-3d-printing-cost',
    slugs: [
      'how-to-calculate-3d-printing-cost',
      '3d-print-batch-cost-per-part',
      '3d-print-support-and-purge-material-cost',
      '3d-print-labour-cost-and-post-processing',
      '3d-print-lead-time-vs-print-time',

      'how-much-to-charge-for-3d-prints',
      '3d-printing-quote-checklist',
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
      GuideContentSlug.ThreeDPrintFirstLayerNotSticking,
      GuideContentSlug.ThreeDPrintWarpingCornersLifting,
      '3d-print-flow-rate-vs-e-steps',
      '3d-print-hole-size-compensation',
      '3d-print-hole-orientation-and-accuracy',
      '3d-print-elephants-foot-and-part-fit',
      '3d-print-heat-set-insert-hole-sizing',
      GuideContentSlug.ThreeDPrintScrewHoleSizing,
      GuideContentSlug.CounterboreVsCountersink3dPrinting,
      GuideContentSlug.CaptiveNutPockets3dPrinting,
      GuideContentSlug.BearingSeatSizing3dPrinting,
      GuideContentSlug.PrintInPlaceClearance,

      '3d-print-snap-fit-clearance',

      'how-to-compensate-for-3d-print-shrinkage',
      '3d-print-tolerance-and-clearance-guide',
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

/** Featured decision relationships. Existing category sections retain every guide. */
export const discoveryTasks = [
  {
    id: 'stl-diagnosis',
    label: 'Interpret STL findings',
    anchor: 'readiness',
    description: 'Decide which finding needs inspection before any repair.',
    primaryGuide: 'how-to-check-stl-for-errors',
    supportingGuide: 'how-to-tell-if-an-stl-is-watertight',
    tools: [PublicRouteUrl.QualityCheck, PublicRouteUrl.WatertightChecker],
  },
  {
    id: 'stl-edits',
    label: 'Choose an STL edit',
    anchor: 'repair',
    description:
      'Separate conservative cleanup from deliberate resizing, then verify the saved copy.',
    primaryGuide: 'how-to-repair-an-stl-file',
    supportingGuide: 'how-to-scale-an-stl-file-for-3d-printing',
    tools: [PublicRouteUrl.StlRepair, PublicRouteUrl.StlScaleTool],
  },
  {
    id: '3mf-examination',
    label: 'Trace the placed 3MF build',
    anchor: '3mf',
    description:
      'Identify intended placements before interpreting missing parts or counts.',
    primaryGuide: '3mf-missing-objects-after-import',
    supportingGuide: 'how-to-check-3mf-triangle-count',
    tools: [PublicRouteUrl.ThreeMfViewer, PublicRouteUrl.ThreeMfQualityCheck],
  },
  {
    id: '3mf-export',
    label: 'Verify a 3MF derivative',
    anchor: '3mf',
    description:
      'Choose delivery scope and compare size and position in the receiving application.',
    primaryGuide: '3mf-to-stl-wrong-size-or-position',
    supportingGuide: '3mf-to-stl-combined-or-separate-parts',
    tools: [
      PublicRouteUrl.ThreeMfToStlConverter,
      PublicRouteUrl.ThreeMfDimensionsChecker,
    ],
  },
  {
    id: 'units-fit',
    label: 'Establish units and fit',
    anchor: 'size',
    description:
      'Resolve physical size, compare candidate orientation, then check actual slicer placement.',
    primaryGuide: 'why-stl-files-have-no-units',
    supportingGuide: 'how-to-check-if-a-3d-model-fits-your-printer',
    tools: [PublicRouteUrl.DimensionsChecker, PublicRouteUrl.PrinterFitChecker],
  },
  {
    id: 'production-quote',
    label: 'Prepare costs and a quotation',
    anchor: 'cost',
    description:
      'Keep production inputs, selling-price assumptions and the customer document separate.',
    primaryGuide: 'how-to-calculate-3d-printing-cost',
    supportingGuide: '3d-printing-quote-checklist',
    tools: [PublicRouteUrl.PrintCostCalculator, PublicRouteUrl.QuoteGenerator],
  },
] as const;

export const priorityDiscoveryPaths = discoveryTasks.flatMap((task) => [
  ...task.tools,
  guideRoutePath(task.primaryGuide),
  guideRoutePath(task.supportingGuide),
]);
