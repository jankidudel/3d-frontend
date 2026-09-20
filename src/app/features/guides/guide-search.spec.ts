import { describe, expect, it } from 'vitest';
import { GuideIndexGroup } from './guide-catalogue';
import { filterGuideGroups } from './guide-search';

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
