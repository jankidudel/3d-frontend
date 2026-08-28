import { Routes } from '@angular/router';
import { PublicRoutePath } from './core/seo/public-routes';

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
    path: PublicRoutePath.ThreeMfDimensionsChecker,
    loadComponent: () =>
      import('./features/three-mf/threemf-dimensions-page').then(
        (m) => m.ThreeMfDimensionsPage,
      ),
  },
  {
    path: PublicRoutePath.Guides,
    loadComponent: () =>
      import('./features/guides/guides-page').then((m) => m.GuidesPage),
  },
  {
    path: PublicRoutePath.FixNonManifoldStlGuide,
    loadComponent: () =>
      import('./features/guides/guide-page').then((m) => m.GuidePage),
    data: { guide: 'non-manifold' },
  },
  {
    path: PublicRoutePath.WatertightStlGuide,
    loadComponent: () =>
      import('./features/guides/guide-page').then((m) => m.GuidePage),
    data: { guide: 'watertight' },
  },
  {
    path: PublicRoutePath.StlUnitsGuide,
    loadComponent: () =>
      import('./features/guides/guide-page').then((m) => m.GuidePage),
    data: { guide: 'units' },
  },
  {
    path: PublicRoutePath.StlTriangleCountGuide,
    loadComponent: () =>
      import('./features/guides/guide-page').then((m) => m.GuidePage),
    data: { guide: 'triangles' },
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
  { path: '**', redirectTo: '' },
];
