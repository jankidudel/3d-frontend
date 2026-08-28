import { RenderMode } from '@angular/ssr';
import { routes } from '../../app.routes';
import { serverRoutes } from '../../app.routes.server';
import { PublicRoutePath } from '../../core/seo/public-routes';

describe('3MF public routes', () => {
  it('registers all 3MF pages as lazy routes', () => {
    expect(
      routes.some((route) => route.path === PublicRoutePath.ThreeMfTools),
    ).toBe(true);
    expect(
      routes.some(
        (route) => route.path === PublicRoutePath.ThreeMfQualityCheck,
      ),
    ).toBe(true);
    expect(
      routes.some((route) => route.path === PublicRoutePath.ThreeMfViewer),
    ).toBe(true);
  });

  it('prerenders all 3MF pages', () => {
    expect(serverRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: PublicRoutePath.ThreeMfTools,
          renderMode: RenderMode.Prerender,
        }),
        expect.objectContaining({
          path: PublicRoutePath.ThreeMfViewer,
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
