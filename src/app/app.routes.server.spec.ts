import { RenderMode } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';
import {
  canonicalPublicRoutePaths,
  PublicRouteSegment,
} from './core/seo/public-routes';

describe('static route rendering', () => {
  it('explicitly prerenders every public route without relying on a broad guide parameter', () => {
    const prerendered = new Set(
      serverRoutes
        .filter((route) => route.renderMode === RenderMode.Prerender)
        .map((route) => route.path),
    );
    for (const path of canonicalPublicRoutePaths) {
      expect(prerendered.has(path), path).toBe(true);
    }
    expect(prerendered.has(`${PublicRouteSegment.Guide}/:guideSlug`)).toBe(
      true,
    );
    expect(prerendered.has(':guideSlug')).toBe(false);
  });
});
