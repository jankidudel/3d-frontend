import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'stl-quality-check', renderMode: RenderMode.Prerender },
  { path: 'stl-dimensions-checker', renderMode: RenderMode.Prerender },
  { path: 'stl-volume-calculator', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: 'cookies', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Prerender },
];
