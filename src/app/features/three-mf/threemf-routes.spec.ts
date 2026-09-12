import { RenderMode } from '@angular/ssr';
import { Routes } from '@angular/router';
import { routes } from '../../app.routes';
import { serverRoutes } from '../../app.routes.server';
import { PublicRoutePathValue as PublicRoutePath } from '../../core/seo/public-routes';

describe('3MF public routes', () => {
  it('registers all 3MF pages as lazy routes', () => {
    expect(routeExists(routes, PublicRoutePath.ThreeMfTools)).toBe(true);
    expect(routeExists(routes, PublicRoutePath.ThreeMfQualityCheck)).toBe(true);
    expect(routeExists(routes, PublicRoutePath.ThreeMfPrintPreflight)).toBe(
      true,
    );
    expect(routeExists(routes, PublicRoutePath.ThreeMfRepair)).toBe(true);
    expect(routeExists(routes, PublicRoutePath.ThreeMfViewer)).toBe(true);
    expect(routeExists(routes, PublicRoutePath.ThreeMfDimensionsChecker)).toBe(
      true,
    );
    expect(
      routeExists(routes, PublicRoutePath.ThreeMfWallThicknessChecker),
    ).toBe(true);
    expect(routeExists(routes, PublicRoutePath.ThreeMfManifoldChecker)).toBe(
      true,
    );
    expect(routeExists(routes, PublicRoutePath.ThreeMfToStlConverter)).toBe(
      true,
    );
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
        expect.objectContaining({
          path: PublicRoutePath.ThreeMfPrintPreflight,
          renderMode: RenderMode.Prerender,
        }),
        expect.objectContaining({
          path: PublicRoutePath.ThreeMfRepair,
          renderMode: RenderMode.Prerender,
        }),
        expect.objectContaining({
          path: PublicRoutePath.ThreeMfDimensionsChecker,
          renderMode: RenderMode.Prerender,
        }),
        expect.objectContaining({
          path: PublicRoutePath.ThreeMfWallThicknessChecker,
          renderMode: RenderMode.Prerender,
        }),
        expect.objectContaining({
          path: PublicRoutePath.ThreeMfManifoldChecker,
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
