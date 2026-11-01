import { GuideIndexGroup } from './guide-catalogue';

export function filterGuideGroups(
  groups: readonly GuideIndexGroup[],
  query: string,
): readonly GuideIndexGroup[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return groups;
  }
  return groups
    .map((group) => ({
      ...group,
      guides: group.guides.filter((guide) => {
        const searchable =
          `${guide.title} ${guide.heading} ${guide.description} ${guide.slug} ${(guide.searchTerms ?? []).join(' ')}`.toLocaleLowerCase();
        return terms.every((term) => searchable.includes(term));
      }),
    }))
    .filter((group) => group.guides.length > 0);
}
