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
] as const;
