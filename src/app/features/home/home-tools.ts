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
        icon: '✦',
        title: 'STL Repair Tool',
        description:
          'Safely remove duplicate and degenerate triangles, and correct simple orientation issues.',
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
        icon: '△',
        title: 'STL Triangle Counter',
        description:
          'Count triangles and understand mesh complexity before slicing or sharing.',
        route: PublicRouteUrl.TriangleCounter,
        cta: 'Count STL triangles',
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
        icon: '◈',
        title: 'STL Volume Calculator',
        description:
          'Calculate your model’s volume, convert units and estimate approximate material weight.',
        route: PublicRouteUrl.VolumeCalculator,
        cta: 'Calculate STL volume',
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
        icon: '△',
        title: '3MF Triangle Counter',
        description:
          'Count triangles in the resolved 3MF print build before slicing.',
        route: PublicRouteUrl.ThreeMfTriangleCounter,
        cta: 'Count 3MF triangles',
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
        icon: '◒',
        title: '3MF Volume Calculator',
        description:
          'Calculate resolved 3MF build volume and estimate solid-model material weight.',
        route: PublicRouteUrl.ThreeMfVolumeCalculator,
        cta: 'Calculate 3MF volume',
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
];
import { PublicRouteUrl } from '../../core/seo/public-routes';
