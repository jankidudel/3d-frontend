import { GuideSlug } from '../../features/guides/generated/guide-slug.generated';

/** Absolute paths derived from the registry-generated slug constants. */
export const GuideRouteUrl = Object.fromEntries(
  Object.entries(GuideSlug).map(([key, slug]) => [key, `/${slug}`]),
) as {
  readonly [Key in keyof typeof GuideSlug]: `/${(typeof GuideSlug)[Key]}`;
};
