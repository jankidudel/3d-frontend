import { RenderMode } from '@angular/ssr';
import { routes } from '../../app.routes';
import { serverRoutes } from '../../app.routes.server';
import { PublicRoutePath } from '../../core/seo/public-routes';

describe('local converter routes', () => {
  it('registers and prerenders both browser-local converters', () => {
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: PublicRoutePath.StlToThreeMfConverter,
        }),
        expect.objectContaining({
          path: PublicRoutePath.ThreeMfToStlConverter,
        }),
      ]),
    );
    expect(serverRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: PublicRoutePath.StlToThreeMfConverter,
          renderMode: RenderMode.Prerender,
        }),
        expect.objectContaining({
          path: PublicRoutePath.ThreeMfToStlConverter,
          renderMode: RenderMode.Prerender,
        }),
      ]),
    );
  });
});
