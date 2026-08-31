import { CanMatchFn } from '@angular/router';
import { guideBySlug } from './guides.generated';

export const guideCanMatch: CanMatchFn = (_route, segments) =>
  segments.length === 1 && segments[0].path in guideBySlug;
