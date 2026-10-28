import { CanMatchFn } from '@angular/router';
import { PublicRouteSegment } from '../../core/seo/public-routes';
import { guideSlugSet } from './generated/guide-route-data.generated';

export const guideCanMatch: CanMatchFn = (_route, segments) =>
  segments.length === 2 &&
  segments[0].path === PublicRouteSegment.Guide &&
  guideSlugSet.has(segments[1].path);
