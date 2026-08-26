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
  readonly id: string;
  readonly intro: string;
  readonly title: string;
  readonly tools: readonly HomeTool[];
}

export const HOME_TOOL_GROUPS: readonly HomeToolGroup[] = [
  {
    exploreLinkText: 'Explore all STL tools',
    exploreRoute: PublicRouteUrl.Tools,
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
    ],
  },
  {
    exploreLinkText: 'Explore 3MF tools',
    exploreRoute: PublicRouteUrl.ThreeMfTools,
    id: '3mf-tools',
    intro:
      'Check 3MF mesh quality, declared units and build-item geometry before slicing.',
    title: '3MF tools',
    tools: [
      {
        icon: '◇',
        title: '3MF Quality Checker',
        description:
          'Check 3MF mesh quality, declared units and build-item geometry before slicing.',
        route: PublicRouteUrl.ThreeMfQualityCheck,
        cta: 'Check 3MF quality',
      },
    ],
  },
];
import { PublicRouteUrl } from '../../core/seo/public-routes';
