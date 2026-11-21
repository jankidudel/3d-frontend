import { CanMatchFn, ResolveFn } from '@angular/router';
import { PublicRouteSegment } from '../../core/seo/public-routes';
import { guideContentLoaders } from './generated/guide-content-loaders.generated';
import { guideSlugSet } from './generated/guide-route-data.generated';
import type { Guide } from './generated/guides.generated';

export const guideCanMatch: CanMatchFn = (_route, segments) =>
  segments.length === 2 &&
  segments[0].path === PublicRouteSegment.Guide &&
  guideSlugSet.has(segments[1].path);

/** Loads only the requested guide body, never the whole guide catalogue. */
export const guideResolver: ResolveFn<Guide> = (route) => {
  const slug = route.paramMap.get('guideSlug');
  const load = slug ? guideContentLoaders[slug] : undefined;
  if (!load) {
    throw new Error('A guide route must resolve to a known guide.');
  }
  return load();
};
