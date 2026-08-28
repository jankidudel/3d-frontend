export const PublicRoutePath = {
  Home: '',
  AllTools: 'tools',
  Tools: 'stl-tools',
  QualityCheck: 'stl-quality-checker',
  ManifoldChecker: 'stl-manifold-checker',
  WatertightChecker: 'stl-watertight-checker',
  DimensionsChecker: 'stl-dimensions-checker',
  TriangleCounter: 'stl-triangle-counter',
  VolumeCalculator: 'stl-volume-calculator',
  Viewer: 'stl-viewer',
  ThreeMfTools: '3mf-tools',
  ThreeMfViewer: '3mf-viewer',
  ThreeMfQualityCheck: '3mf-quality-checker',
  Guides: 'guides',
  FixNonManifoldStlGuide: 'how-to-fix-non-manifold-stl',
  WatertightStlGuide: 'how-to-tell-if-an-stl-is-watertight',
  StlUnitsGuide: 'why-stl-files-have-no-units',
  StlTriangleCountGuide: 'stl-triangle-count-explained',
  Privacy: 'privacy',
  Cookies: 'cookies',
} as const;

type PublicRouteUrls = {
  readonly [
    Key in keyof typeof PublicRoutePath
  ]: `/${(typeof PublicRoutePath)[Key]}`;
};

export const PublicRouteUrl = Object.fromEntries(
  Object.entries(PublicRoutePath).map(([key, path]) => [key, `/${path}`]),
) as PublicRouteUrls;

export const canonicalPublicRoutePaths = [
  PublicRoutePath.Home,
  PublicRoutePath.AllTools,
  PublicRoutePath.Tools,
  PublicRoutePath.QualityCheck,
  PublicRoutePath.ManifoldChecker,
  PublicRoutePath.WatertightChecker,
  PublicRoutePath.DimensionsChecker,
  PublicRoutePath.TriangleCounter,
  PublicRoutePath.VolumeCalculator,
  PublicRoutePath.Viewer,
  PublicRoutePath.ThreeMfTools,
  PublicRoutePath.ThreeMfViewer,
  PublicRoutePath.ThreeMfQualityCheck,
  PublicRoutePath.Guides,
  PublicRoutePath.FixNonManifoldStlGuide,
  PublicRoutePath.WatertightStlGuide,
  PublicRoutePath.StlUnitsGuide,
  PublicRoutePath.StlTriangleCountGuide,
] as const;
