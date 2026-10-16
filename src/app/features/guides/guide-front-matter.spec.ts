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
  heading: 'Example guide',
  faq: [
    { question: 'Is this useful?', answer: 'Yes, it explains the example.' },
    { question: 'Can I use it?', answer: 'Yes, use it as a test fixture.' },
  ],
};

describe('guide front matter validation', () => {
  it('accepts a valid guide and creates its public route', () => {
    const guide = validateGuideFrontMatter(validGuide, filePath);

    expect(guide).toMatchObject({
      title: validGuide.title,
      description: validGuide.description,
      slug: validGuide.slug,
      eyebrow: validGuide.eyebrow,
      heading: validGuide.heading,
    });
    expect(guide.faqs).toHaveLength(2);
    expect(guideRoutePath(guide.slug)).toBe('/example-guide');
  });

  it.each(['title', 'description', 'slug', 'eyebrow', 'heading'] as const)(
    'rejects a missing required %s field',
    (field) => {
      const guide = { ...validGuide } as Record<string, unknown>;
      delete guide[field];

      expect(() => validateGuideFrontMatter(guide, filePath)).toThrow(
        `Guide validation failed: ${filePath} is missing required front-matter field "${field}".`,
      );
    },
  );

  it('allows a guide without a repeated FAQ tail', () => {
    const { faq, ...guide } = validGuide;
    expect(faq).toHaveLength(2);
    expect(validateGuideFrontMatter(guide, filePath).faqs).toEqual([]);
  });

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
