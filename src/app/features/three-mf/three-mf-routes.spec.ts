import { RenderMode } from '@angular/ssr';
import { routes } from '../../app.routes';
import { serverRoutes } from '../../app.routes.server';
import { PublicRoutePath } from '../../core/seo/public-routes';

describe('3MF public routes', () => {
  it('registers both 3MF pages as lazy routes', () => {
    expect(
      routes.some((route) => route.path === PublicRoutePath.ThreeMfTools),
    ).toBe(true);
    expect(
      routes.some(
        (route) => route.path === PublicRoutePath.ThreeMfQualityCheck,
      ),
    ).toBe(true);
  });

  it('prerenders both 3MF pages', () => {
    expect(serverRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: PublicRoutePath.ThreeMfTools,
          renderMode: RenderMode.Prerender,
        }),
        expect.objectContaining({
          path: PublicRoutePath.ThreeMfQualityCheck,
          renderMode: RenderMode.Prerender,
        }),
      ]),
    );
  });
});
