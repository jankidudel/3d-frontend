import { UrlSegment, type PartialMatchRouteSnapshot } from '@angular/router';
import { guideCanMatch } from './guide-route';

describe('guide route matching', () => {
  it('matches an enabled guide from the generated catalogue', () => {
    expect(
      guideCanMatch(
        {},
        [new UrlSegment('how-to-fix-non-manifold-stl', {})],
        {} as PartialMatchRouteSnapshot,
      ),
    ).toBe(true);
  });

  it('declines an unpublished guide route so the normal 404 route handles it', () => {
    expect(
      guideCanMatch(
        {},
        [new UrlSegment('disabled-guide', {})],
        {} as PartialMatchRouteSnapshot,
      ),
    ).toBe(false);
  });
});
