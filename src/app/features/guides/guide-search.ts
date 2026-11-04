import { GuideIndexGroup } from './guide-catalogue';

export function filterGuideGroups(
  groups: readonly GuideIndexGroup[],
  query: string,
  category = '',
  tags: readonly string[] = [],
): readonly GuideIndexGroup[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0 && !category && tags.length === 0) {
    return groups;
  }
  return groups
    .filter((group) => tags.length === 0 || tags.includes(group.id))
    .map((group) => ({
      ...group,
      guides: group.guides.filter((guide) => {
        const searchable =
          `${guide.title} ${guide.heading} ${guide.description} ${guide.slug} ${group.label} ${(guide.searchTerms ?? []).join(' ')}`.toLocaleLowerCase();
        return (
          (!category || guide.category === category) &&
          terms.every((term) => searchable.includes(term))
        );
      }),
    }))
    .filter((group) => group.guides.length > 0);
}
