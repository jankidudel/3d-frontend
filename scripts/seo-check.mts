import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { JSDOM } from 'jsdom';
import { canonicalPublicRoutePaths } from '../src/app/core/seo/public-routes.ts';
import {
  createGuideCatalogue,
  type GuideContent,
} from '../src/app/features/guides/guide-catalogue.ts';
import { validateGuideFrontMatter } from '../src/app/features/guides/guide-front-matter.ts';
import { guidesAsOfDate } from '../src/app/features/guides/guide-publishing.ts';
import {
  type GuideRegistryEntry,
  validateGuideRegistry,
} from '../src/app/features/guides/guide-registry-validation.ts';
import {
  guideGroups,
  guideRegistry,
} from '../src/content/guides/guides.registry.ts';
import {
  loadGeneratedPages,
  validateGeneratedPages,
} from './check-internal-links.mts';
import { GuideSlug } from '../src/app/features/guides/generated/guide-slug.generated.ts';

type Level = 'ERROR' | 'WARNING';
interface Finding {
  level: Level;
  source: string;
  route: string;
  rule: string;
  fix: string;
}
const root = resolve(import.meta.dirname, '..');
const contentDir = resolve(root, 'src/content/guides');
const outputDir = resolve(root, 'dist/3d-frontend/browser');
const siteUrl = 'https://www.inspectmesh.com';
const sourceOnly = process.argv.includes('--source-only');
const findings: Finding[] = [];
const report = (
  level: Level,
  source: string,
  route: string,
  rule: string,
  fix: string,
) => findings.push({ level, source, route, rule, fix });
const files = (await (await import('node:fs/promises')).readdir(contentDir))
  .filter((file) => file.endsWith('.html'))
  .sort();
let registry: readonly GuideRegistryEntry[] = [];
try {
  registry = validateGuideRegistry(guideRegistry, guideGroups, files);
} catch (error) {
  report(
    'ERROR',
    'guides.registry.ts',
    '-',
    String(error),
    'Correct the registry entry.',
  );
  registry = [];
}
const asOf = guidesAsOfDate();
const contents = new Map<string, GuideContent>();
const sourceBySlug = new Map<string, string>();
for (const file of files) {
  const source = `src/content/guides/${file}`;
  const parsed = matter(await readFile(resolve(contentDir, file), 'utf8'));
  try {
    const front = validateGuideFrontMatter(parsed.data, source);
    contents.set(front.slug, {
      ...front,
      html: parsed.content.replace(
        /href="\{\{\s*GuideSlug\.([A-Za-z][A-Za-z0-9]*)\s*\}\}"/g,
        (_match, reference: keyof typeof GuideSlug) =>
          `href="/${GuideSlug[reference]}"`,
      ),
    });
    sourceBySlug.set(front.slug, source);
  } catch (error) {
    report(
      'ERROR',
      source,
      '-',
      String(error),
      'Add valid required front matter.',
    );
  }
}
const catalogue = createGuideCatalogue(registry, guideGroups, contents, asOf);
const publicSlugs = new Set(catalogue.guides.map((guide) => guide.slug));
const knownRoutes = new Set([
  ...canonicalPublicRoutePaths.map((path) => `/${path}`),
  ...registry.map((entry) => `/${entry.slug}`),
]);
const publicRoutes = new Set([
  ...canonicalPublicRoutePaths.map((path) => `/${path}`),
  ...catalogue.guides.map((guide) => `/${guide.slug}`),
]);
const removedGuideRoute = '/why-wont-my-stl-file-slice';
const titles = new Map<string, string>();
const descriptions = new Map<string, string>();
for (const guide of catalogue.guides) {
  const source = sourceBySlug.get(guide.slug) ?? 'unknown';
  const route = `/${guide.slug}`;
  const entry = registry.find((candidate) => candidate.slug === guide.slug)!;
  const document = new JSDOM(guide.html).window.document;
  const checksEditorialTargets = entry.checkEditorialTargets !== false;
  if (guide.faqs.length < 2)
    report(
      'ERROR',
      source,
      route,
      'faq-count',
      'Provide at least two useful FAQ entries.',
    );
  if (guide.title.trim().length < 15 || guide.description.trim().length < 50)
    report(
      'ERROR',
      source,
      route,
      'short-metadata',
      'Write a useful title and meta description.',
    );
  if (titles.has(guide.title))
    report(
      'ERROR',
      source,
      route,
      'duplicate-title',
      `Use a unique title; also used by ${titles.get(guide.title)}.`,
    );
  else titles.set(guide.title, source);
  if (descriptions.has(guide.description))
    report(
      'ERROR',
      source,
      route,
      'duplicate-description',
      `Use a unique description; also used by ${descriptions.get(guide.description)}.`,
    );
  else descriptions.set(guide.description, source);
  const wordCount = (document.body.textContent ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const guideLinks = Array.from(document.querySelectorAll('a[href]'))
    .map((a) => a.getAttribute('href')!)
    .filter((href) => href.startsWith('/'));
  const internalLinks = guideLinks.filter((href) => publicRoutes.has(href));
  const toolLinks = guideLinks.filter((href) =>
    canonicalPublicRoutePaths.some(
      (path) => href === `/${path}` && path !== 'guides',
    ),
  );
  if (toolLinks.length === 0)
    report(
      'ERROR',
      source,
      route,
      'tool-cta',
      'Add a contextual link to the relevant InspectMesh tool.',
    );
  if (internalLinks.length < 2)
    report(
      checksEditorialTargets ? 'ERROR' : 'WARNING',
      source,
      route,
      'internal-links',
      'Add at least two valid contextual internal links.',
    );
  for (const href of guideLinks) {
    if (href.startsWith('/examples/')) {
      try {
        await access(resolve(root, 'public', href.slice(1)));
      } catch {
        report(
          'ERROR',
          source,
          route,
          'missing-example-asset',
          `Example asset does not exist: ${href}.`,
        );
      }
      continue;
    }

    if (!knownRoutes.has(href))
      report(
        'ERROR',
        source,
        route,
        'broken-internal-link',
        `Correct or remove ${href}.`,
      );
    else if (!publicRoutes.has(href))
      report(
        'ERROR',
        source,
        route,
        'unpublished-guide-link',
        `Do not link to disabled or scheduled route ${href}.`,
      );
  }
  if (wordCount < 350 && checksEditorialTargets)
    report(
      'ERROR',
      source,
      route,
      'thin-new-content',
      'Supply at least 350 useful words or explicitly classify a short reference page.',
    );
  if (wordCount < 700)
    report(
      'WARNING',
      source,
      route,
      checksEditorialTargets
        ? 'content-depth-target'
        : 'editorial-target-skipped',
      'Expand only with completed authored editorial content when available.',
    );
  if (guide.title.length < 35 || guide.title.length > 65)
    report(
      'WARNING',
      source,
      route,
      'title-length',
      'Aim for approximately 35–65 characters.',
    );
  if (guide.description.length < 120 || guide.description.length > 160)
    report(
      'WARNING',
      source,
      route,
      'description-length',
      'Aim for approximately 120–160 characters.',
    );
  if (!guide.title.includes('InspectMesh'))
    report(
      'WARNING',
      source,
      route,
      'brand-in-title',
      'Consider including InspectMesh in the title.',
    );
}
for (const [slug, source] of sourceBySlug) {
  if (source === removedGuideRoute || slug === removedGuideRoute.slice(1)) {
    report(
      'ERROR',
      source,
      removedGuideRoute,
      'removed-guide-content',
      'Do not retain content for the permanently redirected guide route.',
    );
  }
}
if (!sourceOnly) {
  await checkGeneratedOutput();
}

async function checkGeneratedOutput(): Promise<void> {
  try {
    await access(outputDir);
    const pages = await loadGeneratedPages(outputDir);
    const pageByRoute = new Map(pages.map((page) => [page.route, page]));
    for (const failure of validateGeneratedPages(pages))
      report(
        'ERROR',
        failure.source,
        failure.resolvedTarget,
        'generated-internal-link',
        `${failure.reason}; correct the link or canonical.`,
      );
    const sitemap = await readFile(resolve(root, 'public/sitemap.xml'), 'utf8');
    const sitemapRoutes = new Set(
      [
        ...sitemap.matchAll(
          /<loc>https:\/\/www\.inspectmesh\.com([^<]*)<\/loc>/g,
        ),
      ].map((match) => match[1] || '/'),
    );
    if (sitemapRoutes.has(removedGuideRoute)) {
      report(
        'ERROR',
        'public/sitemap.xml',
        removedGuideRoute,
        'redirecting-sitemap-url',
        'Sitemaps must contain the final canonical route, not a redirect.',
      );
    }
    for (const sitemapRoute of sitemapRoutes) {
      if (!publicRoutes.has(sitemapRoute)) {
        report(
          'ERROR',
          'public/sitemap.xml',
          sitemapRoute,
          'noncanonical-sitemap-url',
          'Remove URLs that do not map to a canonical generated public page.',
        );
      }
    }
    const renderedTitles = new Map<string, string>();
    const renderedDescriptions = new Map<string, string>();
    for (const route of publicRoutes) {
      const page = pageByRoute.get(route);
      if (!page) {
        report(
          'ERROR',
          'generated output',
          route,
          'missing-generated-page',
          'Prerender the public route.',
        );
        continue;
      }
      const doc = new JSDOM(page.html).window.document;
      if (!sitemap.includes(`${siteUrl}${route}`))
        report(
          'ERROR',
          'public/sitemap.xml',
          route,
          'missing-sitemap-entry',
          'Include every public page in the sitemap.',
        );
      if (doc.querySelectorAll('link[rel="canonical"]').length !== 1)
        report(
          'ERROR',
          page.filePath,
          route,
          'canonical',
          'Render exactly one canonical URL.',
        );
      if (doc.querySelectorAll('h1').length !== 1)
        report('ERROR', page.filePath, route, 'h1', 'Render exactly one H1.');
      const title = doc.title.trim();
      const description = doc
        .querySelector('meta[name="description"]')
        ?.getAttribute('content')
        ?.trim();
      if (!title || !description)
        report(
          'ERROR',
          page.filePath,
          route,
          'rendered-metadata',
          'Render a title and meta description.',
        );
      if (title && renderedTitles.has(title))
        report(
          'ERROR',
          page.filePath,
          route,
          'duplicate-rendered-title',
          `Use a unique title; also used by ${renderedTitles.get(title)}.`,
        );
      else if (title) renderedTitles.set(title, route);
      if (description && renderedDescriptions.has(description))
        report(
          'ERROR',
          page.filePath,
          route,
          'duplicate-rendered-description',
          `Use a unique description; also used by ${renderedDescriptions.get(description)}.`,
        );
      else if (description) renderedDescriptions.set(description, route);
      if (
        doc
          .querySelector('meta[name="robots"]')
          ?.getAttribute('content')
          ?.includes('noindex')
      )
        report(
          'ERROR',
          page.filePath,
          route,
          'production-indexability',
          'Public production pages must be indexable.',
        );
      if (publicSlugs.has(route.slice(1))) {
        const json = doc.querySelector(
          'script[data-seo-structured-data]',
        )?.textContent;
        try {
          const graph = JSON.parse(json ?? '')['@graph'];
          if (
            !Array.isArray(graph) ||
            !graph.some((item) => item?.['@type'] === 'Article') ||
            !graph.some((item) => item?.['@type'] === 'FAQPage')
          )
            report(
              'ERROR',
              page.filePath,
              route,
              'guide-structured-data',
              'Render valid Article and visible FAQ structured data.',
            );
        } catch {
          report(
            'ERROR',
            page.filePath,
            route,
            'guide-structured-data',
            'Render valid Article and visible FAQ structured data.',
          );
        }
      }
    }
  } catch {
    report(
      'WARNING',
      'generated output',
      '-',
      'output-not-present',
      'Run npm run build before checking rendered production HTML.',
    );
  }
}
for (const finding of findings)
  console[finding.level === 'ERROR' ? 'error' : 'warn'](
    `${finding.level}: ${finding.source} ${finding.route} [${finding.rule}] ${finding.fix}`,
  );
console.log(
  `SEO check as of ${asOf}: ${findings.filter((item) => item.level === 'ERROR').length} errors, ${findings.filter((item) => item.level === 'WARNING').length} warnings.`,
);
if (findings.some((item) => item.level === 'ERROR')) process.exitCode = 1;
