export const PublicRoutePath = {
  Home: '',
  QualityCheck: 'stl-quality-check',
  ManifoldChecker: 'stl-manifold-checker',
  DimensionsChecker: 'stl-dimensions-checker',
  VolumeCalculator: 'stl-volume-calculator',
  Privacy: 'privacy',
  Cookies: 'cookies',
} as const;

export const publicRouteUrls = Object.values(PublicRoutePath).map(
  (path) => `/${path}`,
);
