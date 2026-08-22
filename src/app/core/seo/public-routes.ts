import routePaths from './public-routes.json';

export const PublicRoutePath = {
  Home: routePaths.home,
  QualityCheck: routePaths.qualityCheck,
  DimensionsChecker: routePaths.dimensionsChecker,
  VolumeCalculator: routePaths.volumeCalculator,
  Privacy: routePaths.privacy,
  Cookies: routePaths.cookies,
} as const;

export const publicRouteUrls = Object.values(PublicRoutePath).map(
  (path) => `/${path}`,
);
