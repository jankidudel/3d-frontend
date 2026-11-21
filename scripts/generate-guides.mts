import { resolveGuideLinks } from './internal-guide-links.mts';
import { guideSections } from './guide-sections.mts';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, { defaultSchema, type Options } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import { validateGuideFrontMatter } from '../src/app/features/guides/guide-front-matter.ts';
import {
  guideGroups,
  guideRegistry,
} from '../src/content/guides/guides.registry.ts';
import {
  discoveryTasks,
  createGuideClusterIndex,
} from '../src/content/guides/guide-clusters.mts';
import {
  guideRoutePath,
  PublicRoutePathValue,
  MaterialRoutePath,
} from '../src/app/core/seo/public-routes.ts';
import { ExampleAsset } from '../src/app/features/examples/example-assets.ts';
import {
  validateGuideRegistry,
  validateRegistryContentConsistency,
} from '../src/app/features/guides/guide-registry-validation.ts';
import {
  createGuideCatalogue,
  type GuideContent,
} from '../src/app/features/guides/guide-catalogue.ts';
import { guidesAsOfDate } from '../src/app/features/guides/guide-publishing.ts';

const frontendRoot = resolve(import.meta.dirname, '..');
const contentDirectory = resolve(frontendRoot, 'src', 'content', 'guides');
const generatedDirectory = resolve(
  frontendRoot,
  'src',
  'app',
  'features',
  'guides',
  'generated',
);
const outputPath = resolve(generatedDirectory, 'guides.generated.ts');
const routeDataOutputPath = resolve(
  generatedDirectory,
  'guide-route-data.generated.ts',
);
const guideSchema: Options = {
  ...defaultSchema,
  tagNames: [
    'p',
    'h2',
    'h3',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'a',
    'img',
    'figure',
    'figcaption',
    'table',
    'caption',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'details',
    'summary',
    'blockquote',
    'code',
    'pre',
    'sup',
    'sub',
  ],
  attributes: {
    h2: [['id', /^guide-[a-z0-9-]+$/]],
    p: ['className'],
    a: ['href', 'title', 'download'],
    img: [
      'src',
      'alt',
      'title',
      'width',
      'height',
      ['className', 'guide-lazy-image'],
    ],
    details: ['open'],
    th: ['abbr', 'colSpan', 'rowSpan', 'scope'],
    td: ['colSpan', 'rowSpan'],
  },
  protocols: {
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
  strip: ['script', 'iframe', 'object', 'embed', 'form'],
};
const htmlToSafeHtml = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize, guideSchema)
  .use(rehypeStringify);

const internalRouteSlugs = new Set([
  ...Object.values(PublicRoutePathValue),
  ...Object.values(MaterialRoutePath),
  ...guideRegistry.map((guide) => guideRoutePath(guide.slug).slice(1)),
]);
const guideSlugReference = Object.fromEntries(
  [...internalRouteSlugs].map((slug) => [
    `Route${slug
      .split('/')
      .at(-1)!
      .split('-')
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join('')}`,
    slug,
  ]),
);

function resolveInternalGuideLinks(content: string, filePath: string): string {
  return resolveGuideLinks(content, guideSlugReference, filePath);
}

function resolveExampleAssetLinks(content: string, filePath: string): string {
  return content.replace(
    /\{\{\s*ExampleAsset\.([A-Za-z][A-Za-z0-9]*)\s*\}\}/g,
    (_match, key: keyof typeof ExampleAsset) => {
      const path = ExampleAsset[key];
      if (!path) {
        throw new Error(
          `Unknown example asset "${key}" referenced in ${filePath}.`,
        );
      }
      return path;
    },
  );
}

const contentFiles = (await readdir(contentDirectory))
  .filter((file) => file.endsWith('.html'))
  .sort();
await mkdir(generatedDirectory, { recursive: true });
const registry = validateGuideRegistry(
  guideRegistry,
  guideGroups,
  contentFiles,
);
const guideContent = new Map<string, GuideContent>();
for (const fileName of contentFiles) {
  const source = await readFile(resolve(contentDirectory, fileName), 'utf8');
  const parsed = matter(source);
  const filePath = `src/content/guides/${fileName}`;
  const frontMatter = validateGuideFrontMatter(parsed.data, filePath);
  if (/<h1\b/i.test(parsed.content)) {
    throw new Error(
      `Guide validation failed: ${filePath} use front matter for the page h1; guide HTML must not contain an h1.`,
    );
  }
  let tableNumber = 0;
  const content = {
    title: frontMatter.title,
    description: frontMatter.description,
    slug: frontMatter.slug,
    heading: frontMatter.heading,
    eyebrow: frontMatter.eyebrow,
    faqs: frontMatter.faqs,
    html: String(
      await htmlToSafeHtml.process(
        resolveExampleAssetLinks(
          resolveInternalGuideLinks(parsed.content, filePath),
          filePath,
        ),
      ),
    )
      .replaceAll(
        '<table>',
        () =>
          `<div class="guide-table-scroll" tabindex="0" role="region" aria-label="Guide decision table ${++tableNumber}, scroll horizontally"><table>`,
      )
      .replaceAll('</table>', '</table></div>')
      .replace(
        /<img src="\/examples\/slicer-detail\/[^"]+"[^>]*>/g,
        (image) =>
          `<div class="guide-diagram-scroll" tabindex="0" role="region" aria-label="Retained slicer paths, scroll horizontally on small screens">${image}</div>`,
      )
      .replace(
        /<img src="\/examples\/functional-fit\/[^"]+"[^>]*>/g,
        (image) =>
          `<div class="guide-diagram-scroll" tabindex="0" role="region" aria-label="Original functional-fit diagram, scroll horizontally on small screens">${image}</div>`,
      )
      .replace(
        /<img src="\/examples\/split-assembly\/[^"]+"[^>]*>/g,
        (image) =>
          `<div class="guide-diagram-scroll" tabindex="0" role="region" aria-label="Original split and assembly diagram, scroll horizontally on small screens">${image}</div>`,
      )
      .replace(
        /<img src="\/examples\/input-integrity\/[^"]+"[^>]*>/g,
        (image) =>
          `<div class="guide-diagram-scroll" tabindex="0" role="region" aria-label="Original input integrity diagram, scroll horizontally on small screens">${image}</div>`,
      ),
  };
  guideContent.set(fileName, {
    ...content,
    sections: guideSections(content.html),
  });
}
validateRegistryContentConsistency(
  registry,
  [...guideContent.entries()].map(([file, guide]) => ({
    file,
    slug: guide.slug,
  })),
);

const catalogue = createGuideCatalogue(
  registry,
  guideGroups,
  new Map([...guideContent.values()].map((guide) => [guide.slug, guide])),
  guidesAsOfDate(),
);
if (catalogue.guides.length === 0) {
  throw new Error(
    'Guide registry validation failed: enable at least one guide.',
  );
}

const generated = [
  '// Generated by scripts/generate-guides.mts. Do not edit.',
  'export interface GuideFaq { readonly question: string; readonly answer: string; }',
  'export interface Guide { readonly title: string; readonly description: string; readonly slug: string; readonly heading: string; readonly eyebrow: string; readonly group: string; readonly order: number; readonly publishDate: string; readonly updatedDate?: string; readonly faqs: readonly GuideFaq[]; readonly html: string; readonly searchTerms?: readonly string[]; readonly sections?: readonly { readonly id: string; readonly heading: string; readonly html: string; }[]; }',
  'export interface GuideCard { readonly category?: string; readonly searchTerms?: readonly string[]; readonly title: string; readonly description: string; readonly slug: string; readonly heading: string; }',
  'export interface GuideIndexGroup { readonly id: string; readonly label: string; readonly description?: string; readonly pillar?: string; readonly guides: readonly GuideCard[]; }',
  `export const guideDiscoveryTasks = ${JSON.stringify(discoveryTasks, null, 2)} as const;`,
  `export const guideIndexCategories = ${JSON.stringify(
    catalogue.guideIndexGroups.map(({ id, label }) => ({ id, label })),
    null,
    2,
  )} as const;`,
  `export const guideIndexGroups: readonly GuideIndexGroup[] = ${JSON.stringify(createGuideClusterIndex(catalogue.guides.map((guide) => ({ title: guide.title, description: guide.description, slug: guide.slug, heading: guide.heading, category: guide.group, searchTerms: guide.searchTerms }))), null, 2)};`,
  '',
].join('\n');
await writeFile(outputPath, generated);

// Each guide body is its own module so a guide page loads only its article.
// The catalogue above stays light enough for the guide index and search.
const guideContentDirectory = resolve(generatedDirectory, 'guide-content');
await rm(guideContentDirectory, { recursive: true, force: true });
await mkdir(guideContentDirectory, { recursive: true });
for (const guide of catalogue.guides) {
  await writeFile(
    resolve(guideContentDirectory, `${guide.slug}.generated.ts`),
    [
      '// Generated by scripts/generate-guides.mts. Do not edit.',
      "import type { Guide } from '../guides.generated';",
      `export const guide: Guide = ${JSON.stringify(guide, null, 2)};`,
      '',
    ].join('\n'),
  );
}
await writeFile(
  resolve(generatedDirectory, 'guide-content-loaders.generated.ts'),
  [
    '// Generated by scripts/generate-guides.mts. Do not edit.',
    "import type { Guide } from './guides.generated';",
    'export const guideContentLoaders: Readonly<Record<string, () => Promise<Guide>>> = {',
    ...catalogue.guides.map(
      (guide) =>
        `  ${JSON.stringify(guide.slug)}: () => import('./guide-content/${guide.slug}.generated').then((m) => m.guide),`,
    ),
    '};',
    '',
  ].join('\n'),
);
// Synchronous access to every guide body, for tests and build scripts only.
// Application code must use guideContentLoaders so pages stay small.
await writeFile(
  resolve(generatedDirectory, 'guide-content-all.generated.ts'),
  [
    '// Generated by scripts/generate-guides.mts. Do not edit.',
    "import type { Guide } from './guides.generated';",
    ...catalogue.guides.map(
      (guide, index) =>
        `import { guide as guide${index} } from './guide-content/${guide.slug}.generated';`,
    ),
    `export const guides: readonly Guide[] = [${catalogue.guides.map((_, index) => `guide${index}`).join(', ')}];`,
    'export const guideBySlug: Readonly<Record<string, Guide>> = Object.fromEntries(guides.map((guide) => [guide.slug, guide]));',
    '',
  ].join('\n'),
);

const guideSlugOutputPath = resolve(
  generatedDirectory,
  'guide-slug.generated.ts',
);
await writeFile(
  guideSlugOutputPath,
  `// Generated by scripts/generate-guides.mts. Do not edit.\nexport const GuideSlug = ${JSON.stringify(guideSlugReference, null, 2)} as const;\n`,
);

const routeDataGenerated = [
  '// Generated by scripts/generate-guides.mts. Do not edit.',
  `export const guideSlugs: readonly string[] = ${JSON.stringify(catalogue.guides.map((guide) => guide.slug))};`,
  `export const guideRoutePaths: readonly string[] = ${JSON.stringify(catalogue.guides.map((guide) => guideRoutePath(guide.slug)))};`,
  `export const guideBreadcrumbLabelBySlug: Readonly<Record<string, string>> = ${JSON.stringify(Object.fromEntries(catalogue.guides.map((guide) => [guide.slug, guide.heading])))};`,
  'export const guideSlugSet: ReadonlySet<string> = new Set(guideSlugs);',
  '',
].join('\n');
await writeFile(routeDataOutputPath, routeDataGenerated);
