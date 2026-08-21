import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'stl-quality-check',
    loadComponent: () =>
      import('./features/stl-quality/stl-quality-page/stl-quality-page').then(
        (m) => m.StlQualityPage,
      ),
  },
  {
    path: 'stl-dimensions-checker',
    loadComponent: () =>
      import('./features/stl-dimensions/stl-dimensions-page').then(
        (m) => m.StlDimensionsPage,
      ),
  },
  {
    path: 'stl-volume-calculator',
    loadComponent: () =>
      import('./features/stl-volume/stl-volume-page').then(
        (m) => m.StlVolumePage,
      ),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/privacy-page').then((m) => m.PrivacyPage),
  },
  {
    path: 'cookies',
    loadComponent: () =>
      import('./features/legal/cookies-page').then((m) => m.CookiesPage),
  },
  { path: '**', redirectTo: '' },
];
