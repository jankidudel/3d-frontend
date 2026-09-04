import { Routes } from '@angular/router';
import { PublicRoutePath } from './core/seo/public-routes';
import { guideCanMatch } from './features/guides/guide-route';

export const routes: Routes = [
  {
    path: PublicRoutePath.AllTools,
    loadComponent: () =>
      import('./features/tools/tools-page').then((m) => m.ToolsPage),
  },
  {
    path: PublicRoutePath.Tools,
    loadComponent: () =>
      import('./features/stl-tools/stl-tools-page').then((m) => m.StlToolsPage),
  },
  {
    path: PublicRoutePath.Home,
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: PublicRoutePath.QualityCheck,
    loadComponent: () =>
      import('./features/stl-quality/stl-quality-page/stl-quality-page').then(
        (m) => m.StlQualityPage,
      ),
  },
  {
    path: PublicRoutePath.StlRepair,
    loadComponent: () =>
      import('./features/stl-repair/stl-repair-page').then(
        (m) => m.StlRepairPage,
      ),
  },
  {
    path: PublicRoutePath.ManifoldChecker,
    loadComponent: () =>
      import('./features/stl-manifold/stl-manifold-page').then(
        (m) => m.StlManifoldPage,
      ),
  },
  {
    path: PublicRoutePath.WatertightChecker,
    loadComponent: () =>
      import('./features/stl-watertight/stl-watertight-page').then(
        (m) => m.StlWatertightPage,
      ),
  },
  {
    path: PublicRoutePath.TriangleCounter,
    loadComponent: () =>
      import('./features/stl-triangle/stl-triangle-page').then(
        (m) => m.StlTrianglePage,
      ),
  },
  {
    path: PublicRoutePath.DimensionsChecker,
    loadComponent: () =>
      import('./features/stl-dimensions/stl-dimensions-page').then(
        (m) => m.StlDimensionsPage,
      ),
  },
  {
    path: PublicRoutePath.VolumeCalculator,
    loadComponent: () =>
      import('./features/stl-volume/stl-volume-page').then(
        (m) => m.StlVolumePage,
      ),
  },
  {
    path: PublicRoutePath.Viewer,
    loadComponent: () =>
      import('./features/stl-viewer/stl-viewer-page').then(
        (m) => m.StlViewerPage,
      ),
  },
  {
    path: PublicRoutePath.StlToThreeMfConverter,
    loadComponent: () =>
      import('./features/converters/local-converter-page').then(
        (m) => m.StlToThreeMfConverterPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfTools,
    loadComponent: () =>
      import('./features/three-mf/threemf-tools-page').then(
        (m) => m.ThreeMfToolsPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfViewer,
    loadComponent: () =>
      import('./features/three-mf/threemf-viewer-page').then(
        (m) => m.ThreeMfViewerPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfQualityCheck,
    loadComponent: () =>
      import('./features/three-mf/threemf-quality-page').then(
        (m) => m.ThreeMfQualityPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfRepair,
    loadComponent: () =>
      import('./features/three-mf/threemf-repair-page').then(
        (m) => m.ThreeMfRepairPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfDimensionsChecker,
    loadComponent: () =>
      import('./features/three-mf/threemf-dimensions-page').then(
        (m) => m.ThreeMfDimensionsPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfWatertightChecker,
    loadComponent: () =>
      import('./features/three-mf/threemf-watertight-page').then(
        (m) => m.ThreeMfWatertightPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfManifoldChecker,
    loadComponent: () =>
      import('./features/three-mf/threemf-manifold-page').then(
        (m) => m.ThreeMfManifoldPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfTriangleCounter,
    loadComponent: () =>
      import('./features/three-mf/threemf-triangle-page').then(
        (m) => m.ThreeMfTrianglePage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfVolumeCalculator,
    loadComponent: () =>
      import('./features/three-mf/threemf-volume-page').then(
        (m) => m.ThreeMfVolumePage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfToStlConverter,
    loadComponent: () =>
      import('./features/converters/local-converter-page').then(
        (m) => m.ThreeMfToStlConverterPage,
      ),
  },
  {
    path: PublicRoutePath.Guides,
    loadComponent: () =>
      import('./features/guides/guides-page').then((m) => m.GuidesPage),
  },
  {
    path: PublicRoutePath.Privacy,
    loadComponent: () =>
      import('./features/legal/privacy-page').then((m) => m.PrivacyPage),
  },
  {
    path: PublicRoutePath.Cookies,
    loadComponent: () =>
      import('./features/legal/cookies-page').then((m) => m.CookiesPage),
  },
  {
    path: ':guideSlug',
    canMatch: [guideCanMatch],
    loadComponent: () =>
      import('./features/guides/guide-page').then((m) => m.GuidePage),
  },
  {
    path: PublicRoutePath.NotFound,
    loadComponent: () =>
      import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
