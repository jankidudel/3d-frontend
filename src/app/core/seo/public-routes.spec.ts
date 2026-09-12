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
      path: '3d-print-orientation-planner',
      pageType: PageType.Tool,
    });
    expect(PublicRoutePath.RotateModelToFitPrinterGuide.pageType).toBe(
      PageType.Guide,
    );
    expect(PublicRoutePathValue.OrientationPlanner).toBe(
      PublicRoutePath.OrientationPlanner.path,
    );
    expect(PublicRouteUrl.OrientationPlanner).toBe(
      '/3d-print-orientation-planner',
    );
  });

  it('finds a route by URL without using a path prefix', () => {
    expect(getPublicRouteForUrl('/3mf-viewer?source=menu')?.pageType).toBe(
      PageType.Tool,
    );
    expect(getPublicRouteForUrl('/guides')?.pageType).toBe(PageType.Guide);
    expect(getPublicRouteForUrl('/unregistered-route')).toBeUndefined();
  });
});
