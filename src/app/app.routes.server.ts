import { RenderMode, ServerRoute } from '@angular/ssr';
import { PublicRoutePath } from './core/seo/public-routes';

export const serverRoutes: ServerRoute[] = [
  { path: PublicRoutePath.Home, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.AllTools, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.Tools, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.QualityCheck, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.ManifoldChecker, renderMode: RenderMode.Prerender },
  {
    path: PublicRoutePath.WatertightChecker,
    renderMode: RenderMode.Prerender,
  },
  { path: PublicRoutePath.DimensionsChecker, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.TriangleCounter, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.VolumeCalculator, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.Viewer, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.ThreeMfTools, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.ThreeMfViewer, renderMode: RenderMode.Prerender },
  {
    path: PublicRoutePath.ThreeMfQualityCheck,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.ThreeMfDimensionsChecker,
    renderMode: RenderMode.Prerender,
  },
  { path: PublicRoutePath.Guides, renderMode: RenderMode.Prerender },
  {
    path: PublicRoutePath.FixNonManifoldStlGuide,
    renderMode: RenderMode.Prerender,
  },
  {
    path: PublicRoutePath.WatertightStlGuide,
    renderMode: RenderMode.Prerender,
  },
  { path: PublicRoutePath.StlUnitsGuide, renderMode: RenderMode.Prerender },
  {
    path: PublicRoutePath.StlTriangleCountGuide,
    renderMode: RenderMode.Prerender,
  },
  { path: PublicRoutePath.Privacy, renderMode: RenderMode.Prerender },
  { path: PublicRoutePath.Cookies, renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Prerender },
];
