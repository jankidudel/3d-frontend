export interface GuideRegistryEntry {
  readonly slug: string;
  readonly enabled: boolean;
  readonly group: string;
  readonly order: number;
  readonly publishDate: string;
  readonly checkEditorialTargets?: boolean;
}

export interface GuideGroup {
  readonly label: string;
}

export interface GuideContentReference {
  readonly file: string;
  readonly slug: string;
}

const supportedRegistryFields = new Set([
  'slug',
  'enabled',
  'group',
  'order',
  'publishDate',
  'checkEditorialTargets',
]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function guideContentFileName(slug: string): string {
  return `${slug}.html`;
}

export function validateGuideRegistry(
  value: unknown,
  groups: Readonly<Record<string, GuideGroup>>,
  contentFiles: readonly string[],
): readonly GuideRegistryEntry[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw registryError('must contain at least one entry.');
  }

  const entries = value.map((entry, index) =>
    registryEntry(entry, index, groups, contentFiles),
  );
  validateUnique(entries, 'slug');
  validateOrders(entries);
  validateRegisteredFiles(entries, contentFiles);
  return entries;
}

export function validateRegistryContentConsistency(
  entries: readonly GuideRegistryEntry[],
  content: readonly GuideContentReference[],
): void {
  const contentSlugByFile = new Map(
    content.map((guide) => [guide.file, guide.slug]),
  );
  for (const entry of entries) {
    const file = guideContentFileName(entry.slug);
    const contentSlug = contentSlugByFile.get(file);
    if (contentSlug !== entry.slug) {
      throw registryError(
        `entry "${entry.slug}" does not match the front-matter slug "${contentSlug}" in "${file}".`,
      );
    }
  }
}

function registryEntry(
  value: unknown,
  index: number,
  groups: Readonly<Record<string, GuideGroup>>,
  contentFiles: readonly string[],
): GuideRegistryEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw registryError(`entry ${index} must be an object.`);
  }
  const record = value as Record<string, unknown>;
  for (const field of Object.keys(record)) {
    if (!supportedRegistryFields.has(field)) {
      throw registryError(`entry ${index} has unknown field "${field}".`);
    }
  }

  const slug = requiredString(record, 'slug', index);
  if (!slugPattern.test(slug)) {
    throw registryError(
      `entry "${slug}" has invalid slug "${slug}". Use lowercase letters, numbers, and single hyphens between words.`,
    );
  }
  const file = guideContentFileName(slug);
  if (!contentFiles.includes(file)) {
    throw registryError(`entry "${slug}" references missing file "${file}".`);
  }
  if (typeof record['enabled'] !== 'boolean') {
    throw registryError(`entry "${slug}" must provide boolean "enabled".`);
  }
  const group = requiredString(record, 'group', index);
  if (!(group in groups)) {
    throw registryError(`entry "${slug}" has unknown group "${group}".`);
  }
  const order = record['order'];
  if (typeof order !== 'number' || !Number.isFinite(order)) {
    throw registryError(`entry "${slug}" must provide numeric "order".`);
  }

  const publishDate = requiredString(record, 'publishDate', index);
  if (!isDateOnlyUtc(publishDate)) {
    throw registryError(
      `entry "${slug}" must provide valid YYYY-MM-DD "publishDate".`,
    );
  }
  if (
    'checkEditorialTargets' in record &&
    typeof record['checkEditorialTargets'] !== 'boolean'
  ) {
    throw registryError(
      `entry "${slug}" must provide boolean "checkEditorialTargets" when present.`,
    );
  }
  return {
    slug,
    enabled: record['enabled'],
    group,
    order,
    publishDate,
    checkEditorialTargets: record['checkEditorialTargets'] as
      boolean | undefined,
  };
}

function isDateOnlyUtc(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
  );
}

function requiredString(
  record: Record<string, unknown>,
  field: string,
  index: number,
): string {
  const value = record[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw registryError(
      `entry ${index} must provide non-empty string "${field}".`,
    );
  }
  return value;
}

function validateUnique(
  entries: readonly GuideRegistryEntry[],
  field: 'slug',
): void {
  const values = new Set<string>();
  for (const entry of entries) {
    if (values.has(entry[field])) {
      throw registryError(`contains duplicate ${field} "${entry[field]}".`);
    }
    values.add(entry[field]);
  }
}

function validateOrders(entries: readonly GuideRegistryEntry[]): void {
  const entriesByGroupAndOrder = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.group}:${entry.order}`;
    if (entriesByGroupAndOrder.has(key)) {
      throw registryError(
        `contains duplicate order "${entry.order}" in group "${entry.group}".`,
      );
    }
    entriesByGroupAndOrder.add(key);
  }
}

function validateRegisteredFiles(
  entries: readonly GuideRegistryEntry[],
  contentFiles: readonly string[],
): void {
  const registeredFiles = new Set(
    entries.map((entry) => guideContentFileName(entry.slug)),
  );
  for (const file of contentFiles) {
    if (!registeredFiles.has(file)) {
      throw registryError(`content file "${file}" has no registry entry.`);
    }
  }
}

function registryError(message: string): Error {
  return new Error(`Guide registry validation failed: ${message}`);
}
