import { createGuideCatalogue, type GuideContent } from './guide-catalogue';
import type {
  GuideGroup,
  GuideRegistryEntry,
} from './guide-registry-validation';

const groups: Record<string, GuideGroup> = {
  general: { label: 'General 3D printing guides' },
  stl: { label: 'STL guides' },
  '3mf': { label: '3MF guides' },
};
const content = (slug: string): GuideContent => ({
  title: `${slug} | InspectMesh`,
  description: `${slug} description`,
  slug,
  heading: slug,
  eyebrow: 'Guide',
  faqs: [],
  html: '<p>Guide body.</p>',
});

describe('guide catalogue', () => {
  it('publishes only enabled guides in group and display order', () => {
    const registry: readonly GuideRegistryEntry[] = [
      {
        slug: 'stl-second',
        file: 'stl-second.html',
        enabled: true,
        group: 'stl',
        order: 20,
      },
      {
        slug: 'disabled-guide',
        file: 'disabled-guide.html',
        enabled: false,
        group: 'general',
        order: 10,
      },
      {
        slug: 'stl-first',
        file: 'stl-first.html',
        enabled: true,
        group: 'stl',
        order: 10,
      },
    ];
    const catalogue = createGuideCatalogue(
      registry,
      groups,
      new Map([
        ['stl-second.html', content('stl-second')],
        ['disabled-guide.html', content('disabled-guide')],
        ['stl-first.html', content('stl-first')],
      ]),
    );

    expect(catalogue.guides.map((guide) => guide.slug)).toEqual([
      'stl-first',
      'stl-second',
    ]);
    expect(catalogue.guideIndexGroups).toEqual([
      {
        id: 'stl',
        label: 'STL guides',
        guides: [
          expect.objectContaining({ slug: 'stl-first' }),
          expect.objectContaining({ slug: 'stl-second' }),
        ],
      },
    ]);
    expect(catalogue.relatedGuidesBySlug['stl-first']).toEqual([
      expect.objectContaining({ slug: 'stl-second' }),
    ]);
    expect(catalogue.relatedGuidesBySlug['disabled-guide']).toBeUndefined();
  });
});
