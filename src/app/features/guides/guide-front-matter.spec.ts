import {
  guideRoutePath,
  validateGuideFrontMatter,
  validateGuideSlugs,
} from './guide-front-matter';

const filePath = 'src/content/guides/example-guide.html';
const validGuide = {
  title: 'Example guide | InspectMesh',
  description: 'A useful example guide.',
  slug: 'example-guide',
  eyebrow: 'STL guide',
};

describe('guide front matter validation', () => {
  it('accepts a valid guide and creates its public route', () => {
    const guide = validateGuideFrontMatter(validGuide, filePath);

    expect(guide).toMatchObject(validGuide);
    expect(guide.faqs).toEqual([]);
    expect(guideRoutePath(guide.slug)).toBe('/example-guide');
  });

  it.each(['title', 'description', 'slug', 'eyebrow'] as const)(
    'rejects a missing required %s field',
    (field) => {
      const guide = { ...validGuide } as Record<string, unknown>;
      delete guide[field];

      expect(() => validateGuideFrontMatter(guide, filePath)).toThrow(
        `Guide validation failed: ${filePath} is missing required front-matter field "${field}".`,
      );
    },
  );

  it('rejects invalid slug formats', () => {
    expect(() =>
      validateGuideFrontMatter(
        { ...validGuide, slug: 'Invalid_slug' },
        filePath,
      ),
    ).toThrow('field "slug" must contain only lowercase letters');
  });

  it('rejects duplicate slugs', () => {
    expect(() =>
      validateGuideSlugs([
        { filePath, slug: 'example-guide' },
        {
          filePath: 'src/content/guides/other-guide.html',
          slug: 'example-guide',
        },
      ]),
    ).toThrow('field "slug" duplicates "example-guide"');
  });

  it('accepts a guide without FAQ data', () => {
    expect(validateGuideFrontMatter(validGuide, filePath).faqs).toEqual([]);
  });

  it('rejects malformed FAQ data', () => {
    expect(() =>
      validateGuideFrontMatter(
        { ...validGuide, faq: [{ question: 'Can this STL print?' }] },
        filePath,
      ),
    ).toThrow('faq[0].answer must be a non-empty string.');
  });

  it('rejects unknown front-matter fields', () => {
    expect(() =>
      validateGuideFrontMatter(
        { ...validGuide, descripton: 'Typo in field name' },
        filePath,
      ),
    ).toThrow('has unknown front-matter field "descripton".');
  });
});
