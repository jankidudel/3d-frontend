import { CanMatchFn } from '@angular/router';
import { guideSlugSet } from './generated/guide-route-data.generated';

export const guideCanMatch: CanMatchFn = (_route, segments) =>
  segments.length === 1 && guideSlugSet.has(segments[0].path);
