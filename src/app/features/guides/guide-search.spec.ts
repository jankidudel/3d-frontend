import { describe, expect, it } from 'vitest';
import { GuideIndexGroup } from './guide-catalogue';
import { guideIndexGroups } from './generated/guides.generated';
import { filterGuideGroups } from './guide-search';
import { GuideContentSlug } from '../../../content/guides/guides.registry';

const groups: readonly GuideIndexGroup[] = [
  {
    id: 'stl',
    label: 'STL guides',
    guides: [
      {
        title: 'STL Scale Guide',
        heading: 'Scale an STL file',
        description: 'Convert an STL to the intended physical dimensions.',
        slug: 'stl-scale-factor-explained',
      },
    ],
  },
  {
    id: 'three-mf',
    label: '3MF guides',
    guides: [
      {
        title: '3MF Units Guide',
        heading: 'Understand 3MF units',
        description: 'Check declared units before slicing.',
        slug: '3mf-units-explained',
      },
    ],
  },
];

describe('filterGuideGroups', () => {
  it('finds distinct interface owners through their task aliases', () => {
    for (const [slug, terms] of [
      [
        GuideContentSlug.ThreeDPrintScrewHoleSizing,
        ['screw passage', 'pilot hole', 'screw clearance'],
      ],
      [
        GuideContentSlug.CounterboreVsCountersink3dPrinting,
        ['head recess', 'counterbore', 'countersink'],
      ],
      [
        GuideContentSlug.CaptiveNutPockets3dPrinting,
        ['nut trap', 'captive nut', 'nut pocket'],
      ],
    ] as const) {
      for (const term of terms) {
        const matches = filterGuideGroups(guideIndexGroups, term).flatMap(
          (group) => group.guides,
        );
        expect(matches.filter((guide) => guide.slug === slug)).toHaveLength(1);
      }
    }
  });
  it('keeps the complete index for an empty search', () => {
    expect(filterGuideGroups(groups, '   ')).toBe(groups);
  });

  it('matches across title, heading, description and slug', () => {
    expect(filterGuideGroups(groups, 'physical dimensions')).toEqual([
      expect.objectContaining({ id: 'stl' }),
    ]);
    expect(filterGuideGroups(groups, '3mf-units')).toEqual([
      expect.objectContaining({ id: 'three-mf' }),
    ]);
  });

  it('requires every entered word and removes empty groups', () => {
    expect(filterGuideGroups(groups, 'stl units')).toEqual([]);
  });
});

describe('slicer detail intent discovery', () => {
  it('finds the established owner through spelling and symptom aliases', () => {
    for (const [terms, slug] of [
      [
        ['lettering', 'engraved', 'debossed', 'logo', 'counter'],
        'embossed-text-not-printing',
      ],
      [
        ['vase', 'spiral', 'spiralize', 'spiralise'],
        'vase-mode-vs-normal-printing',
      ],
      [
        ['roof', 'top-solid', 'top-skin', 'missing-top'],
        'missing-top-layers-in-slicer',
      ],
    ] as const) {
      for (const term of terms) {
        expect(
          filterGuideGroups(guideIndexGroups, term)
            .flatMap((group) => group.guides)
            .map((guide) => guide.slug),
        ).toContain(slug);
      }
    }
  });
});
