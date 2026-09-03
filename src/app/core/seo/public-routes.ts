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
  StlToThreeMfConverter: 'stl-to-3mf-converter',
  ThreeMfTools: '3mf-tools',
  ThreeMfViewer: '3mf-viewer',
  ThreeMfQualityCheck: '3mf-quality-checker',
  ThreeMfDimensionsChecker: '3mf-dimensions-checker',
  ThreeMfWatertightChecker: '3mf-watertight-checker',
  ThreeMfManifoldChecker: '3mf-manifold-checker',
  ThreeMfTriangleCounter: '3mf-triangle-counter',
  ThreeMfVolumeCalculator: '3mf-volume-calculator',
  ThreeMfToStlConverter: '3mf-to-stl-converter',
  Guides: 'guides',
  RotateModelToFitPrinterGuide: 'how-to-rotate-a-3d-model-to-fit-your-printer',
  FixNonManifoldStlGuide: 'how-to-fix-non-manifold-stl',
  WatertightStlGuide: 'how-to-tell-if-an-stl-is-watertight',
  StlUnitsGuide: 'why-stl-files-have-no-units',
  StlTriangleCountGuide: 'stl-triangle-count-explained',
  StlToThreeMfGuide: 'how-to-convert-stl-to-3mf',
  ThreeMfToStlGuide: 'how-to-convert-3mf-to-stl',
  Privacy: 'privacy',
  Cookies: 'cookies',
  NotFound: '404',
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
  PublicRoutePath.StlToThreeMfConverter,
  PublicRoutePath.ThreeMfTools,
  PublicRoutePath.ThreeMfViewer,
  PublicRoutePath.ThreeMfQualityCheck,
  PublicRoutePath.ThreeMfDimensionsChecker,
  PublicRoutePath.ThreeMfWatertightChecker,
  PublicRoutePath.ThreeMfManifoldChecker,
  PublicRoutePath.ThreeMfTriangleCounter,
  PublicRoutePath.ThreeMfVolumeCalculator,
  PublicRoutePath.ThreeMfToStlConverter,
  PublicRoutePath.Guides,
] as const;
