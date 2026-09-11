import { RenderMode, ServerRoute } from '@angular/ssr';
import { PublicRoutePath } from './core/seo/public-routes';
import { guideSlugs } from './features/guides/guide-route-data.generated';

export const serverRoutes: ServerRoute[] = [
  { path: PublicRoutePath.Home, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.AllTools, renderMode: RenderMode.Prerender },
  {
    path: PublicRoutePath.PrintCostCalculator,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.ToleranceCalculator,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.GcodePreflightChecker,
    renderMode: RenderMode.Prerender,
  },
  { path: PublicRoutePath.Tools, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.QualityCheck, renderMode: RenderMode.Prerender },
  {
    path: PublicRoutePath.StlPrintPreflight,
    renderMode: RenderMode.Prerender,
  },
  { path: PublicRoutePath.StlRepair, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.ManifoldChecker, renderMode: RenderMode.Prerender },
  {
    path: PublicRoutePath.WatertightChecker,
    renderMode: RenderMode.Prerender,
  },
  { path: PublicRoutePath.DimensionsChecker, renderMode: RenderMode.Prerender },
  {
    path: PublicRoutePath.StlWallThicknessChecker,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.StlOverhangChecker,
    renderMode: RenderMode.Prerender,
  },
  { path: PublicRoutePath.StlSplitter, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.TriangleCounter, renderMode: RenderMode.Prerender },
  {
    path: PublicRoutePath.StlFileSizeReducer,
    renderMode: RenderMode.Prerender,
  },
  { path: PublicRoutePath.VolumeCalculator, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.Viewer, renderMode: RenderMode.Prerender },
  {
    path: PublicRoutePath.StlToThreeMfConverter,
    renderMode: RenderMode.Prerender,
  },
  { path: PublicRoutePath.ThreeMfTools, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.ThreeMfViewer, renderMode: RenderMode.Prerender },
  {
    path: PublicRoutePath.ThreeMfQualityCheck,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.ThreeMfPrintPreflight,
    renderMode: RenderMode.Prerender,
  },
  { path: PublicRoutePath.ThreeMfRepair, renderMode: RenderMode.Prerender },
  {
    path: PublicRoutePath.ThreeMfDimensionsChecker,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.ThreeMfWallThicknessChecker,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.ThreeMfOverhangChecker,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.ThreeMfWatertightChecker,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.ThreeMfManifoldChecker,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.ThreeMfTriangleCounter,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.ThreeMfVolumeCalculator,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.ThreeMfToStlConverter,
    renderMode: RenderMode.Prerender,
  },
  { path: PublicRoutePath.Guides, renderMode: RenderMode.Prerender },
  {
    path: ':guideSlug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      guideSlugs.map((guideSlug) => ({ guideSlug })),
  },
  { path: PublicRoutePath.Privacy, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.Cookies, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.NotFound, renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Server },
];
