export interface HomeTool {
  readonly cta: string;
  readonly description: string;
  readonly icon: string;
  readonly route: string;
  readonly title: string;
}

export interface HomeToolGroup {
  readonly exploreLinkText: string;
  readonly exploreRoute: string;
  readonly homeLinkText: string;
  readonly id: string;
  readonly intro: string;
  readonly title: string;
  readonly tools: readonly HomeTool[];
}

export const HOME_TOOL_GROUPS: readonly HomeToolGroup[] = [
  {
    exploreLinkText: 'Explore all STL tools',
    exploreRoute: PublicRouteUrl.Tools,
    homeLinkText: 'View all STL tools',
    id: 'stl-tools',
    intro:
      'Check the quality, shape, dimensions and material-volume estimates of STL models before printing.',
    title: 'STL tools',
    tools: [
      {
        icon: '◉',
        title: 'Free STL Viewer',
        description:
          'Open an STL locally in your browser, inspect it in 3D and see its dimensions and triangle count.',
        route: PublicRouteUrl.Viewer,
        cta: 'Open STL Viewer',
      },
      {
        icon: '✓',
        title: 'STL Quality Checker',
        description:
          'Find common mesh problems before printing, including open edges, non-manifold geometry, duplicate triangles and orientation issues.',
        route: PublicRouteUrl.QualityCheck,
        cta: 'Check STL quality',
      },
      {
        icon: '◎',
        title: 'STL Print Preflight Checker',
        description:
          'Run mesh, size, printer-fit, sampled wall-thickness and volume checks together before slicing.',
        route: PublicRouteUrl.StlPrintPreflight,
        cta: 'Run STL preflight',
      },
      {
        icon: '✦',
        title: 'STL Repair Tool',
        description:
          'Clean duplicate and degenerate triangles, and correct simple orientation issues before checking the STL again.',
        route: PublicRouteUrl.StlRepair,
        cta: 'Clean an STL safely',
      },
      {
        icon: '○',
        title: 'STL Watertight Checker',
        description:
          'Check whether an STL has a closed surface, open edges or possible holes.',
        route: PublicRouteUrl.WatertightChecker,
        cta: 'Check watertightness',
      },
      {
        icon: '⌁',
        title: 'STL Manifold Checker',
        description:
          'Check whether an STL is closed and manifold, with clear counts for open edges, non-manifold edges and separate shells.',
        route: PublicRouteUrl.ManifoldChecker,
        cta: 'Check STL topology',
      },
      {
        icon: '↔',
        title: 'STL Dimensions Checker',
        description:
          'Measure an STL, convert units, calculate proportional scaling and check whether it fits your printer.',
        route: PublicRouteUrl.DimensionsChecker,
        cta: 'Measure an STL file',
      },
      {
        icon: '↗',
        title: 'STL Scale Tool',
        description:
          'Resize an STL proportionally by percentage, target dimension, or an assumed unit conversion, then download it locally.',
        route: PublicRouteUrl.StlScaleTool,
        cta: 'Scale an STL',
      },
      {
        icon: '▤',
        title: 'STL Wall Thickness Checker',
        description:
          'Estimate sampled wall thickness locally and identify areas that may need closer print-preparation review.',
        route: PublicRouteUrl.StlWallThicknessChecker,
        cta: 'Check wall thickness',
      },
      {
        icon: '↘',
        title: 'STL Overhang Checker',
        description:
          'Highlight downward-facing geometry that exceeds your chosen overhang review threshold.',
        route: PublicRouteUrl.StlOverhangChecker,
        cta: 'Check overhang risk',
      },
      {
        title: 'STL Splitter',
        description: 'Split a valid STL into two capped printable parts.',
        route: PublicRouteUrl.StlSplitter,
        icon: '◈',
        cta: 'Split an STL',
      },
      {
        icon: '◈',
        title: 'STL Volume Calculator',
        description:
          'Calculate your model’s volume, convert units and estimate approximate material weight.',
        route: PublicRouteUrl.VolumeCalculator,
        cta: 'Calculate STL volume',
      },
      {
        icon: '△',
        title: 'STL Triangle Counter',
        description:
          'Count triangles and understand mesh complexity before slicing or sharing.',
        route: PublicRouteUrl.TriangleCounter,
        cta: 'Count STL triangles',
      },
      {
        icon: '▽',
        title: 'STL File Size Reducer',
        description:
          'Convert ASCII STL to binary locally or simplify a copy with clear before-and-after file and triangle counts.',
        route: PublicRouteUrl.StlFileSizeReducer,
        cta: 'Reduce STL file size',
      },
      {
        icon: '⇄',
        title: 'STL to 3MF Converter',
        description:
          'Convert an STL into a basic 3MF locally and choose the unit for its existing coordinates.',
        route: PublicRouteUrl.StlToThreeMfConverter,
        cta: 'Convert STL to 3MF',
      },
    ],
  },
  {
    exploreLinkText: 'Explore all 3MF tools',
    exploreRoute: PublicRouteUrl.ThreeMfTools,
    homeLinkText: 'View all 3MF tools',
    id: '3mf-tools',
    intro:
      'Check 3MF mesh quality, declared units and build-item geometry before slicing.',
    title: '3MF tools',
    tools: [
      {
        icon: '◉',
        title: 'Free 3MF Viewer',
        description:
          'Open a 3MF model locally, inspect it in 3D and review its declared units, dimensions and triangle count.',
        route: PublicRouteUrl.ThreeMfViewer,
        cta: 'Open a 3MF file',
      },
      {
        icon: '◇',
        title: '3MF Quality Checker',
        description:
          'Check 3MF mesh quality, declared units and build-item geometry before slicing.',
        route: PublicRouteUrl.ThreeMfQualityCheck,
        cta: 'Check 3MF quality',
      },
      {
        icon: '◎',
        title: '3MF Print Preflight Checker',
        description:
          'Resolve a 3MF build locally and check unit, size, printer fit, mesh integrity, sampled wall thickness and volume guidance together.',
        route: PublicRouteUrl.ThreeMfPrintPreflight,
        cta: 'Run 3MF preflight',
      },
      {
        icon: '✦',
        title: '3MF Repair Tool',
        description:
          'Safely remove duplicate and degenerate triangles from a 3MF package without rebuilding its resources.',
        route: PublicRouteUrl.ThreeMfRepair,
        cta: 'Repair a 3MF file',
      },
      {
        icon: '○',
        title: '3MF Watertight Checker',
        description:
          'Check resolved 3MF build geometry for open edges before slicing.',
        route: PublicRouteUrl.ThreeMfWatertightChecker,
        cta: 'Check 3MF watertightness',
      },
      {
        icon: '⌁',
        title: '3MF Manifold Checker',
        description:
          'Check resolved 3MF geometry for open edges, non-manifold edges and separate shells.',
        route: PublicRouteUrl.ThreeMfManifoldChecker,
        cta: 'Check 3MF topology',
      },
      {
        icon: '↔',
        title: '3MF Dimensions Checker',
        description:
          'Measure final 3MF build dimensions, confirm declared units and check printer fit.',
        route: PublicRouteUrl.ThreeMfDimensionsChecker,
        cta: 'Measure a 3MF file',
      },
      {
        icon: '◈',
        title: '3MF Volume Calculator',
        description:
          'Calculate resolved 3MF build volume and estimate solid-model material weight.',
        route: PublicRouteUrl.ThreeMfVolumeCalculator,
        cta: 'Calculate 3MF volume',
      },
      {
        icon: '▤',
        title: '3MF Wall Thickness Checker',
        description:
          'Estimate sampled wall thickness in resolved 3MF build geometry locally, including transforms and repeated objects.',
        route: PublicRouteUrl.ThreeMfWallThicknessChecker,
        cta: 'Check wall thickness',
      },
      {
        icon: '↘',
        title: '3MF Overhang Checker',
        description:
          'Review resolved 3MF build geometry for downward-facing overhang risk before slicing.',
        route: PublicRouteUrl.ThreeMfOverhangChecker,
        cta: 'Check overhang risk',
      },
      {
        icon: '△',
        title: '3MF Triangle Counter',
        description:
          'Count triangles in the resolved 3MF print build before slicing.',
        route: PublicRouteUrl.ThreeMfTriangleCounter,
        cta: 'Count 3MF triangles',
      },
      {
        icon: '⇄',
        title: '3MF to STL Converter',
        description:
          'Export resolved 3MF build geometry as one binary STL locally in your browser.',
        route: PublicRouteUrl.ThreeMfToStlConverter,
        cta: 'Convert 3MF to STL',
      },
    ],
  },
  {
    exploreLinkText: 'Explore all 3D tools',
    exploreRoute: PublicRouteUrl.AllTools,
    homeLinkText: 'View all 3D tools',
    id: 'planning-tools',
    intro:
      'Plan functional dimensions and estimate the practical costs of a planned 3D print.',
    title: 'Planning and functional tools',
    tools: [
      {
        icon: '▣',
        title: '3D Printer Fit Checker',
        description:
          'Check an STL or 3MF bounding box against a named printer or custom build volume, with local unit, clearance, rotation and scale guidance.',
        route: PublicRouteUrl.PrinterFitChecker,
        cta: 'Check printer fit',
      },
      {
        icon: '↻',
        title: '3D Print Orientation Planner',
        description:
          'Compare six sensible STL or 3MF build directions for printer fit, downward-facing geometry and estimated bed contact.',
        route: PublicRouteUrl.OrientationPlanner,
        cta: 'Plan an orientation',
      },
      {
        icon: '▦',
        title: '3D Print Bed Layout Planner',
        description:
          'Arrange multiple STL and 3MF model footprints on your saved printer bed before opening the slicer.',
        route: PublicRouteUrl.BedLayoutPlanner,
        cta: 'Plan a print bed',
      },
      {
        icon: '↔',
        title: '3D Print Tolerance & Clearance Calculator',
        description:
          'Turn a chosen fit intent and your calibration measurements into editable hole and pin model dimensions.',
        route: PublicRouteUrl.ToleranceCalculator,
        cta: 'Calculate a fit',
      },
      {
        icon: '↗',
        title: '3D Print Shrinkage Calculator',
        description:
          'Calculate per-axis CAD or slicer scale compensation from your own measured calibration print.',
        route: PublicRouteUrl.ShrinkageCalculator,
        cta: 'Calculate shrinkage',
      },
      {
        icon: '£',
        title: '3D Print Cost Calculator',
        description:
          'Estimate filament, energy, machine and labour costs from slicer values or model volume.',
        route: PublicRouteUrl.PrintCostCalculator,
        cta: 'Calculate print cost',
      },
      {
        icon: '£',
        title: '3D Printing Price Calculator',
        description:
          'Build a customer quote from production costs, quantity and target profit margin.',
        route: PublicRouteUrl.PrintPriceCalculator,
        cta: 'Calculate a price',
      },
      {
        icon: '⌇',
        title: 'Filament Length Calculator',
        description:
          'Convert filament weight to length, or length to weight, using spool diameter and material density.',
        route: PublicRouteUrl.FilamentLengthCalculator,
        cta: 'Convert filament length',
      },
    ],
  },
  {
    exploreLinkText: 'Explore all 3D tools',
    exploreRoute: PublicRouteUrl.AllTools,
    homeLinkText: 'View all 3D tools',
    id: 'print-workflow-tools',
    intro:
      'Inspect the sliced file as a final review between slicer preview and print.',
    title: 'G-code and print workflow',
    tools: [
      {
        icon: '⌁',
        title: 'G-code Viewer & Preflight Checker',
        description:
          'Open sliced G-code locally to inspect parsed layers, extrusion and travel paths, metadata and preflight details before printing.',
        route: PublicRouteUrl.GcodePreflightChecker,
        cta: 'Inspect G-code',
      },
    ],
  },
  {
    id: 'collections-and-planning',
    title: 'Collections and next-job planning',
    intro:
      'Review repeated file work, compare a revised export, then check filament, walls, throughput and finish time with explicit assumptions.',
    exploreLinkText: 'Explore all print workflows',
    exploreRoute: PublicRouteUrl.AllTools,
    homeLinkText: 'View all print workflows',
    tools: [
      {
        icon: '▦',
        title: 'Batch STL and 3MF Checker',
        description:
          'Check a small collection locally and export independent findings, settings and sampled-check limits.',
        route: PublicRouteUrl.BatchStlChecker,
        cta: 'Check a collection',
      },
      {
        icon: '⇄',
        title: 'STL Revision Comparison',
        description:
          'Overlay before/after exports in one coordinate frame and inspect bidirectional sampled surface distances.',
        route: PublicRouteUrl.StlCompare,
        cta: 'Compare revisions',
      },
      {
        icon: '⌇',
        title: 'Filament Remaining Calculator',
        description:
          'Subtract empty-spool tare and reserve, then check a complete sliced job or number of copies.',
        route: PublicRouteUrl.FilamentRemainingCalculator,
        cta: 'Check spool sufficiency',
      },
      {
        icon: '▤',
        title: 'Nozzle, Layer Height and Wall Planner',
        description:
          'Separate diameter from actual line width and estimate nominal wall lines before slicer review.',
        route: PublicRouteUrl.NozzleLayerHeightCalculator,
        cta: 'Plan wall lines',
      },
      {
        icon: '↗',
        title: 'Volumetric Flow Calculator',
        description:
          'Calculate requested throughput without inventing a hotend limit or recommended machine speed.',
        route: PublicRouteUrl.VolumetricFlowCalculator,
        cta: 'Plan requested flow',
      },
      {
        icon: '◷',
        title: 'Print Finish Time Calculator',
        description:
          'Add elapsed slicer duration to a chosen start across dates and daylight-saving boundaries.',
        route: PublicRouteUrl.PrintFinishTimeCalculator,
        cta: 'Plan a finish time',
      },
    ],
  },
];
import { PublicRouteUrl } from '../../core/seo/public-routes';
