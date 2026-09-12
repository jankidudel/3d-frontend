import { RenderMode } from '@angular/ssr';
import { Routes } from '@angular/router';
import { routes } from '../../app.routes';
import { serverRoutes } from '../../app.routes.server';
import { PublicRoutePathValue as PublicRoutePath } from '../../core/seo/public-routes';

describe('local converter routes', () => {
  it('registers and prerenders both browser-local converters', () => {
    expect(routeExists(routes, PublicRoutePath.StlToThreeMfConverter)).toBe(
      true,
    );
    expect(routeExists(routes, PublicRoutePath.ThreeMfToStlConverter)).toBe(
      true,
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

function routeExists(routes: Routes, path: string): boolean {
  return routes.some(
    (route) => route.path === path || routeExists(route.children ?? [], path),
  );
}
