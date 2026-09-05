import { isGuidePublic, guidesAsOfDate } from './guide-publishing';

describe('guide publishing', () => {
  const guide = {
    slug: 'example-guide',
    enabled: true,
    group: 'stl',
    order: 1,
    publishDate: '2026-09-06',
  };

  it('excludes future-dated and disabled guides using a deterministic date', () => {
    expect(isGuidePublic(guide, '2026-09-05')).toBe(false);
    expect(isGuidePublic(guide, '2026-09-06')).toBe(true);
    expect(isGuidePublic({ ...guide, enabled: false }, '2026-09-06')).toBe(
      false,
    );
  });

  it('rejects an invalid deterministic date', () => {
    expect(() => guidesAsOfDate('2026-02-30')).toThrow('GUIDES_AS_OF_DATE');
  });
});
