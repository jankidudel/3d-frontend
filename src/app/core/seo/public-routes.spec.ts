import {
  getPublicRouteForUrl,
  PageType,
  PublicRoutePath,
  PublicRoutePathValue,
  PublicRouteUrl,
} from './public-routes';

describe('public route metadata', () => {
  it('keeps the path and page type together for named routes', () => {
    expect(PublicRoutePath.OrientationPlanner).toEqual({
      path: 'tools/3d-print-orientation-planner',
      pageType: PageType.Tool,
    });
    expect(PublicRoutePath.RotateModelToFitPrinterGuide.pageType).toBe(
      PageType.Guide,
    );
    expect(PublicRoutePathValue.OrientationPlanner).toBe(
      PublicRoutePath.OrientationPlanner.path,
    );
    expect(PublicRouteUrl.OrientationPlanner).toBe(
      '/tools/3d-print-orientation-planner',
    );
  });

  it('finds a route by URL without using a path prefix', () => {
    expect(
      getPublicRouteForUrl('/tools/3mf-viewer?source=menu')?.pageType,
    ).toBe(PageType.Tool);
    expect(getPublicRouteForUrl('/guides')?.pageType).toBe(PageType.Guide);
    expect(getPublicRouteForUrl('/unregistered-route')).toBeUndefined();
  });

  it('places every interactive tool and format hub under /tools while retaining section directories', () => {
    const sections = new Set<string>([
      PublicRouteUrl.AllTools,
      PublicRouteUrl.Materials,
      PublicRouteUrl.Printers,
      PublicRouteUrl.Compare,
    ]);
    for (const route of Object.values(PublicRoutePath).filter(
      (route) => route.pageType === PageType.Tool,
    )) {
      const url = `/${route.path}`;
      if (!sections.has(url)) {
        expect(url.startsWith('/tools/'), url).toBe(true);
      }
    }
    expect(PublicRouteUrl.AllTools).toBe('/tools');
    expect(PublicRouteUrl.Materials).toBe('/materials');
  });
});
