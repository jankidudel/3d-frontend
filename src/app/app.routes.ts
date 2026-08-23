import { Routes } from '@angular/router';
import { PublicRoutePath } from './core/seo/public-routes';

export const routes: Routes = [
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
