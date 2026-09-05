import type {
  GuideGroup,
  GuideRegistryEntry,
} from './guide-registry-validation.ts';

export interface GuideContent {
  readonly title: string;
  readonly description: string;
  readonly slug: string;
  readonly heading: string;
  readonly eyebrow: string;
  readonly publishDate: string;
  readonly faqs: readonly {
    readonly question: string;
    readonly answer: string;
  }[];
  readonly html: string;
}

export interface Guide extends GuideContent {
  readonly group: string;
  readonly order: number;
}

export interface GuideCard {
  readonly title: string;
  readonly description: string;
  readonly slug: string;
  readonly heading: string;
}

export interface GuideIndexGroup {
  readonly id: string;
  readonly label: string;
  readonly guides: readonly GuideCard[];
}

export interface GuideCatalogue {
  readonly guides: readonly Guide[];
  readonly guideIndexGroups: readonly GuideIndexGroup[];
  readonly relatedGuidesBySlug: Readonly<Record<string, readonly GuideCard[]>>;
}

export function createGuideCatalogue(
  registry: readonly GuideRegistryEntry[],
  groups: Readonly<Record<string, GuideGroup>>,
  contentBySlug: ReadonlyMap<string, GuideContent>,
  asOf = new Date().toISOString().slice(0, 10),
): GuideCatalogue {
  const groupIds = Object.keys(groups);
  const guides = registry
    .filter((entry) => entry.enabled && entry.publishDate <= asOf)
    .sort(
      (first, second) =>
        groupIds.indexOf(first.group) - groupIds.indexOf(second.group) ||
        first.order - second.order,
    )
    .map((entry) => guideFromEntry(entry, contentBySlug));

  return {
    guides,
    guideIndexGroups: groupIds
      .map((id) => ({
        id,
        label: groups[id]?.label ?? id,
        guides: guides.filter((guide) => guide.group === id).map(guideCard),
      }))
      .filter((group) => group.guides.length > 0),
    relatedGuidesBySlug: Object.fromEntries(
      guides.map((guide) => [
        guide.slug,
        guides
          .filter((candidate) => candidate.slug !== guide.slug)
          .map(guideCard),
      ]),
    ),
  };
}

function guideFromEntry(
  entry: GuideRegistryEntry,
  contentBySlug: ReadonlyMap<string, GuideContent>,
): Guide {
  const content = contentBySlug.get(entry.slug);
  if (!content) {
    throw new Error(
      `Guide registry validation failed: entry "${entry.slug}" has no content.`,
    );
  }
  return { ...content, group: entry.group, order: entry.order };
}

function guideCard(guide: Guide): GuideCard {
  return {
    title: guide.title,
    description: guide.description,
    slug: guide.slug,
    heading: guide.heading,
  };
}
