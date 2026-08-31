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
  file: 'example-guide.html',
  enabled: true,
  group: 'stl',
  order: 10,
};

describe('guide registry validation', () => {
  it('accepts a valid registry entry', () => {
    expect(validateGuideRegistry([entry], groups, files)).toEqual([entry]);
  });

  it.each([
    ['missing registry entries', [], 'must contain at least one entry', files],
    [
      'a stale registry entry',
      [{ ...entry, file: 'missing-guide.html' }],
      'references missing file "missing-guide.html"',
      files,
    ],
    [
      'duplicate slugs',
      [entry, { ...entry, file: 'other-guide.html' }],
      'contains duplicate slug "example-guide"',
      [...files, 'other-guide.html'],
    ],
    [
      'duplicate files',
      [entry, { ...entry, slug: 'other-guide' }],
      'contains duplicate file "example-guide.html"',
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
