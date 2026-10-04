import {
  validateGuideRegistry,
  validateRegistryContentConsistency,
  type GuideGroup,
} from './guide-registry-validation';

const groups: Record<string, GuideGroup> = {
  stl: { label: 'STL guides' },
};
const files = ['example-guide.html'];
const entry = {
  slug: 'example-guide',
  enabled: true,
  group: 'stl',
  order: 10,
  publishDate: '2026-09-05',
};

describe('guide registry validation', () => {
  it('preserves a real editorial update separately from first publication', () => {
    const revised = { ...entry, updatedDate: '2026-10-04' };
    expect(validateGuideRegistry([revised], groups, files)).toEqual([revised]);
  });
  it.each(['2026-09-04', '2026-02-30', 'build-time'])(
    'rejects invalid editorial update %s',
    (updatedDate) => {
      expect(() =>
        validateGuideRegistry([{ ...entry, updatedDate }], groups, files),
      ).toThrow('updatedDate');
    },
  );
  it('accepts a valid registry entry', () => {
    expect(validateGuideRegistry([entry], groups, files)).toEqual([entry]);
  });

  it.each([
    ['missing registry entries', [], 'must contain at least one entry', files],
    [
      'a stale registry entry',
      [{ ...entry, slug: 'missing-guide' }],
      'references missing file "missing-guide.html"',
      files,
    ],
    [
      'duplicate slugs',
      [entry, { ...entry, order: 20 }],
      'contains duplicate slug "example-guide"',
      files,
    ],
    [
      'an invalid group',
      [{ ...entry, group: 'unknown' }],
      'has unknown group "unknown"',
      files,
    ],
  ])('rejects %s', (_description, registry, error, registryFiles) => {
    expect(() =>
      validateGuideRegistry(registry, groups, registryFiles),
    ).toThrow(error);
  });

  it('rejects a registry entry with an unknown file field', () => {
    expect(() =>
      validateGuideRegistry(
        [{ ...entry, file: 'example-guide.html' }],
        groups,
        files,
      ),
    ).toThrow('has unknown field "file"');
  });

  it('rejects an unregistered HTML content file', () => {
    expect(() =>
      validateGuideRegistry([entry], groups, [...files, 'unregistered.html']),
    ).toThrow('content file "unregistered.html" has no registry entry');
  });

  it('rejects a registry and front-matter slug mismatch', () => {
    const registry = validateGuideRegistry([entry], groups, files);

    expect(() =>
      validateRegistryContentConsistency(registry, [
        { file: 'example-guide.html', slug: 'different-slug' },
      ]),
    ).toThrow('does not match the front-matter slug "different-slug"');
  });
});
