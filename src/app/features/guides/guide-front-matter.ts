export interface GuideFaq {
  readonly question: string;
  readonly answer: string;
}

export interface GuideFrontMatter {
  readonly title: string;
  readonly description: string;
  readonly slug: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly faqs: readonly GuideFaq[];
  readonly publishDate: string;
  readonly published?: string;
  readonly updated?: string;
  readonly image?: string;
  readonly keywords?: readonly string[];
  readonly relatedTools?: readonly string[];
}

interface GuideSlugReference {
  readonly filePath: string;
  readonly slug: string;
}

const supportedFields = new Set([
  'title',
  'description',
  'slug',
  'eyebrow',
  'heading',
  'faq',
  'published',
  'updated',
  'image',
  'keywords',
  'relatedTools',
  'publishDate',
]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateGuideFrontMatter(
  value: unknown,
  filePath: string,
): GuideFrontMatter {
  const record = guideRecord(value, filePath);
  validateSupportedFields(record, filePath);

  const title = requiredString(record, 'title', filePath);
  const description = requiredString(record, 'description', filePath);
  const slug = requiredString(record, 'slug', filePath);
  const eyebrow = requiredString(record, 'eyebrow', filePath);
  const heading = requiredString(record, 'heading', filePath);
  const publishDate = requiredString(record, 'publishDate', filePath);
  if (!isDateOnlyUtc(publishDate)) {
    throw validationError(
      filePath,
      'field "publishDate" must use a real YYYY-MM-DD UTC date.',
    );
  }
  if (!slugPattern.test(slug)) {
    throw validationError(
      filePath,
      'field "slug" must contain only lowercase letters, numbers, and single hyphens between words.',
    );
  }

  return {
    title,
    description,
    slug,
    eyebrow,
    heading,
    faqs: requiredFaqs(record, filePath),
    publishDate,
    published: optionalString(record, 'published', filePath),
    updated: optionalString(record, 'updated', filePath),
    image: optionalString(record, 'image', filePath),
    keywords: optionalStringList(record, 'keywords', filePath),
    relatedTools: optionalStringList(record, 'relatedTools', filePath),
  };
}

export function validateGuideSlugs(
  guides: readonly GuideSlugReference[],
): void {
  const filePathBySlug = new Map<string, string>();
  for (const guide of guides) {
    const existingFilePath = filePathBySlug.get(guide.slug);
    if (existingFilePath) {
      throw validationError(
        guide.filePath,
        `field "slug" duplicates "${guide.slug}" in ${existingFilePath}.`,
      );
    }
    filePathBySlug.set(guide.slug, guide.filePath);
  }
}

export function guideRoutePath(slug: string): `/${string}` {
  return `/${slug}`;
}

function guideRecord(
  value: unknown,
  filePath: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError(filePath, 'front matter must be an object.');
  }
  return value as Record<string, unknown>;
}

function validateSupportedFields(
  record: Record<string, unknown>,
  filePath: string,
): void {
  for (const field of Object.keys(record)) {
    if (!supportedFields.has(field)) {
      throw validationError(
        filePath,
        `has unknown front-matter field "${field}".`,
      );
    }
  }
}

function requiredString(
  record: Record<string, unknown>,
  field: string,
  filePath: string,
): string {
  if (!(field in record)) {
    throw validationError(
      filePath,
      `is missing required front-matter field "${field}".`,
    );
  }
  const value = record[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw validationError(
      filePath,
      `field "${field}" must be a non-empty string.`,
    );
  }
  return value;
}

function optionalString(
  record: Record<string, unknown>,
  field: string,
  filePath: string,
): string | undefined {
  if (!(field in record)) {
    return undefined;
  }
  const value = record[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw validationError(
      filePath,
      `field "${field}" must be a non-empty string when provided.`,
    );
  }
  return value;
}

function requiredFaqs(
  record: Record<string, unknown>,
  filePath: string,
): readonly GuideFaq[] {
  if (!('faq' in record)) {
    throw validationError(
      filePath,
      'is missing required front-matter field "faq".',
    );
  }
  const value = record['faq'];
  if (!Array.isArray(value) || value.length === 0) {
    throw validationError(
      filePath,
      'field "faq" must be a non-empty array when provided.',
    );
  }
  return value.map((faq, index) => faqEntry(faq, index, filePath));
}

function isDateOnlyUtc(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
  );
}

function faqEntry(value: unknown, index: number, filePath: string): GuideFaq {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError(filePath, `faq[${index}] must be an object.`);
  }
  const record = value as Record<string, unknown>;
  return {
    question: requiredFaqString(record, 'question', index, filePath),
    answer: requiredFaqString(record, 'answer', index, filePath),
  };
}

function requiredFaqString(
  record: Record<string, unknown>,
  field: string,
  index: number,
  filePath: string,
): string {
  const value = record[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw validationError(
      filePath,
      `faq[${index}].${field} must be a non-empty string.`,
    );
  }
  return value;
}

function optionalStringList(
  record: Record<string, unknown>,
  field: string,
  filePath: string,
): readonly string[] | undefined {
  if (!(field in record)) {
    return undefined;
  }
  const value = record[field];
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || item.trim().length === 0)
  ) {
    throw validationError(
      filePath,
      `field "${field}" must be an array of non-empty strings when provided.`,
    );
  }
  return value;
}

function validationError(filePath: string, message: string): Error {
  return new Error(`Guide validation failed: ${filePath} ${message}`);
}
