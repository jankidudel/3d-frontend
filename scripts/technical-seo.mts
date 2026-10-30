import { auditDiscovery } from './discovery-audit.mts';
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { withHtmlDocument } from './html-document.mts';
import {
  loadGeneratedPages,
  validateGeneratedPages,
  type GeneratedPage,
} from './check-internal-links.mts';
import { documentUrl } from './document-urls.mts';
import { discoverRouter, type RegisteredRoute } from './router-source.mts';
import { auditRouteCoverage, parseSitemapXml } from './route-coverage.mts';
import {
  routeSearchPolicy,
  productionOrigin,
  RouteDisposition,
} from './route-search-policy.mts';
import { robotsAccess } from './verify-production-routes.mts';
import {
  artifactFiles,
  artifactHash,
  outputDirectory,
  reportDirectory,
  sourceIdentity,
} from './seo-artifact.mts';
import { guideRegistry } from '../src/content/guides/guides.registry.ts';

export const Severity = {
  Error: 'ERROR',
  Warning: 'WARN',
  Unknown: 'UNKNOWN',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];
export const AuditStage = {
  Html: 'html',
  Render: 'render',
  Live: 'live',
  Performance: 'performance',
} as const;
export type AuditStage = (typeof AuditStage)[keyof typeof AuditStage];
export interface Finding {
  rule: string;
  severity: Severity;
  url: string;
  stage: AuditStage;
  observed: string;
  expected: string;
  source: string | null;
  correction: string;
}
export function finding(
  rule: string,
  severity: Severity,
  path: string,
  stage: AuditStage,
  observed: string,
  expected: string,
  source: string | null = null,
): Finding {
  return {
    rule,
    severity,
    url: new URL(path, productionOrigin).href,
    stage,
    observed,
    expected,
    source,
    correction: `Restore ${expected}; inspect ${source ?? path}.`,
  };
}
export function blocksIndexing(document: Document): boolean {
  return [...document.querySelectorAll('meta[name]')].some(
    (element) =>
      ['robots', 'googlebot'].includes(
        element.getAttribute('name')!.toLowerCase(),
      ) &&
      /(?:^|[\s,;])(?:noindex|none)(?:$|[\s,;])/i.test(
        element.getAttribute('content') ?? '',
      ),
  );
}

/** Resolve component selector from the actual router import and TypeScript decorator, not built HTML. */
export function expectedSelector(route: RegisteredRoute): string {
  const module = route.renderer.match(/import\(['"]([^'"]+)['"]\)/)?.[1];
  const className = route.renderer.match(
    /\.then\(\s*\(\w+\)\s*=>\s*\w+\.(\w+)/,
  )?.[1];
  if (!module || !className) {
    throw new Error(
      `R02: unsupported renderer contract for ${route.path}: ${route.renderer}`,
    );
  }
  const source = resolve(
    dirname(route.source.replace(/:\d+$/, '')),
    module + '.ts',
  );
  const ast = ts.createSourceFile(
    source,
    readFileSync(source, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = ast.statements.find(
    (node) => ts.isClassDeclaration(node) && node.name?.text === className,
  );
  if (declaration && ts.isClassDeclaration(declaration)) {
    for (const decorator of ts.getDecorators(declaration) ?? []) {
      if (!ts.isCallExpression(decorator.expression)) {
        continue;
      }
      const arg = decorator.expression.arguments[0];
      if (arg && ts.isObjectLiteralExpression(arg)) {
        const selector = arg.properties.find(
          (property) =>
            ts.isPropertyAssignment(property) &&
            property.name.getText(ast) === 'selector',
        );
        if (
          selector &&
          ts.isPropertyAssignment(selector) &&
          ts.isStringLiteral(selector.initializer)
        ) {
          return selector.initializer.text;
        }
      }
    }
  }
  throw new Error(
    `R02: missing component selector for ${route.path} in ${source}`,
  );
}

export function inspectSchema(document: Document, path: string): Finding[] {
  const result: Finding[] = [];
  const report = (
    id: string,
    severity: Severity,
    observed: string,
    expected: string,
  ) =>
    result.push(
      finding(id, severity, path, AuditStage.Html, observed, expected),
    );
  const h1 = document.querySelector('h1')?.textContent?.trim();
  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') {
      return;
    }
    const item = value as Record<string, unknown>;
    const types = Array.isArray(item['@type'])
      ? item['@type']
      : [item['@type']];
    if (types.includes('Article')) {
      if (item['headline'] !== h1) {
        report(
          'D02',
          Severity.Error,
          String(item['headline']),
          'Article headline matching visible H1',
        );
      }
      const guide = guideRegistry.find((entry) => '/' + entry.slug === path);
      if (
        guide &&
        (item['datePublished'] !== guide.publishDate ||
          (item['dateModified'] ?? guide.publishDate) !==
            (guide.updatedDate ?? guide.publishDate))
      ) {
        report(
          'D02',
          Severity.Error,
          'Article dates differ from authored registry',
          'traceable publication and modification dates',
        );
      }
      for (const key of ['author', 'image']) {
        if (!item[key]) {
          report(
            'D03',
            Severity.Warning,
            `Article has no ${key}`,
            `supported representative ${key} only when visibly credited/relevant`,
          );
        }
      }
    }
    if (types.includes('BreadcrumbList')) {
      const entries = item['itemListElement'];
      if (!Array.isArray(entries) || !entries.length) {
        report(
          'D01',
          Severity.Error,
          'Empty breadcrumb list',
          'nonempty ordered BreadcrumbList',
        );
      } else {
        entries.forEach((entry, index) => {
          const value = entry as Record<string, unknown>;
          if (
            value['position'] !== index + 1 ||
            !value['name'] ||
            typeof value['item'] !== 'string' ||
            !value['item'].startsWith(productionOrigin + '/')
          ) {
            report(
              'D02',
              Severity.Error,
              JSON.stringify(value),
              'ordered named absolute production breadcrumbs',
            );
          }
          if (
            value['name'] &&
            !document
              .querySelector('main, app-breadcrumbs, nav')
              ?.ownerDocument.body.textContent?.includes(String(value['name']))
          ) {
            report(
              'D02',
              Severity.Error,
              String(value['name']),
              'breadcrumb name present in visible page',
            );
          }
        });
      }
    }
    if (types.includes('FAQPage')) {
      const questions = item['mainEntity'];
      if (
        !Array.isArray(questions) ||
        questions.some(
          (question) =>
            !question?.name ||
            !question?.acceptedAnswer?.text ||
            !document.body.textContent
              ?.replace(/\s+/g, ' ')
              .includes(String(question.name).replace(/\s+/g, ' ')),
        )
      ) {
        report(
          'D02',
          Severity.Error,
          'Invalid or invisible FAQ questions',
          'FAQ schema matching useful visible answers; markup itself is optional',
        );
      }
    }
    Object.values(item).forEach(visit);
  }
  for (const script of document.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    try {
      const value: unknown = JSON.parse(script.textContent ?? '');
      if (!value || typeof value !== 'object') {
        throw new Error('JSON-LD root must be an object or array');
      }
      visit(value);
    } catch (error) {
      report(
        'D01',
        Severity.Error,
        String(error),
        'parseable JSON-LD in every block',
      );
    }
  }
  return result;
}

export async function writeReport(
  name: string,
  report: { findings: Finding[]; [key: string]: unknown },
) {
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(
    resolve(reportDirectory, name + '.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  const columns = [
    'rule',
    'severity',
    'url',
    'stage',
    'observed',
    'expected',
    'source',
    'correction',
  ] as const;
  const csv = [
    columns.join(','),
    ...report.findings.map((row) =>
      columns
        .map(
          (column) =>
            '"' + String(row[column] ?? '').replaceAll('"', '""') + '"',
        )
        .join(','),
    ),
  ].join('\n');
  await writeFile(resolve(reportDirectory, name + '.csv'), csv + '\n');
  console.log(
    `${name}: complete=${String(report['complete'])}, ${String(report['completed'])}/${String(report['expected'])} pages, ${report.findings.filter((f) => f.severity === Severity.Error).length} errors, ${report.findings.filter((f) => f.severity === Severity.Warning).length} warnings, ${report.findings.filter((f) => f.severity === Severity.Unknown).length} unknown. Reports: tmp/seo/${name}.{json,csv}`,
  );
}

export async function auditHtml(pages?: GeneratedPage[]) {
  const started = performance.now();
  const findings: Finding[] = [];
  let complete = false;
  const rows = [];
  let sourceSha256: string | null = null;
  let artifactSha256: string | null = null;
  try {
    const source = await sourceIdentity();
    sourceSha256 = source.sourceSha256;
    artifactSha256 = artifactHash(await artifactFiles());
    const version = JSON.parse(
      await readFile(resolve(outputDirectory, 'version.json'), 'utf8'),
    );
    if (version.sourceSha256 !== sourceSha256) {
      findings.push(
        finding(
          'R07',
          Severity.Error,
          '/',
          AuditStage.Html,
          'Source differs from build',
          'same source fingerprint as version.json',
        ),
      );
    }
    pages ??= await loadGeneratedPages(outputDirectory);
    const router = discoverRouter();
    const entries = parseSitemapXml(
      await readFile(resolve(outputDirectory, 'sitemap.xml'), 'utf8'),
    );
    const coverage = auditRouteCoverage(
      router,
      routeSearchPolicy,
      pages,
      entries.entries,
    );
    const discovery = auditDiscovery(pages, entries.entries);
    await mkdir(reportDirectory, { recursive: true });
    await writeFile(
      resolve(reportDirectory, 'discovery.json'),
      JSON.stringify(discovery, null, 2) + '\n',
    );
    for (const error of discovery.failures) {
      findings.push(
        finding(
          'L06',
          Severity.Error,
          '/',
          AuditStage.Html,
          error,
          'crawlable contextual relationships, current routes and matching breadcrumbs',
        ),
      );
    }
    for (const error of coverage.failures) {
      findings.push(
        finding(
          'R01',
          Severity.Error,
          '/',
          AuditStage.Html,
          error,
          'classified complete router/output/sitemap/link sets',
        ),
      );
    }
    for (const error of validateGeneratedPages(pages)) {
      findings.push(
        finding(
          'L05',
          Severity.Error,
          error.resolvedTarget,
          AuditStage.Html,
          error.reason,
          `unique existing destination for ${error.originalUrl}`,
          error.source,
        ),
      );
    }
    const robots = await readFile(
      resolve(outputDirectory, 'robots.txt'),
      'utf8',
    );
    const assets = new Set<string>();
    const asOf =
      process.env['GUIDES_AS_OF_DATE'] ?? new Date().toISOString().slice(0, 10);
    for (const entry of entries.entries) {
      if (entry.lastmod && entry.lastmod > asOf) {
        findings.push(
          finding(
            'S04',
            Severity.Error,
            entry.loc,
            AuditStage.Html,
            entry.lastmod,
            `lastmod no later than ${asOf}`,
          ),
        );
      }
    }
    for (const policy of routeSearchPolicy) {
      const page = pages.find((candidate) => candidate.route === policy.path);
      if (!page) {
        continue;
      }
      rows.push(
        withHtmlDocument(page.html, (document) => {
          const route = router.routes.find(
            (candidate) => candidate.path === policy.path,
          )!;
          const selector = expectedSelector(route);
          if (!document.querySelector(selector)) {
            findings.push(
              finding(
                'R02',
                Severity.Error,
                policy.path,
                AuditStage.Html,
                'Wrong component document',
                `router component ${selector}`,
                route.source,
              ),
            );
          }
          if (
            blocksIndexing(document) !== policy.noindex ||
            (!policy.noindex && !robotsAccess(robots, policy.path, 'Googlebot'))
          ) {
            findings.push(
              finding(
                'I01',
                Severity.Error,
                policy.path,
                AuditStage.Html,
                'Conflicting crawl/index signals',
                'robots and meta matching explicit route intent',
                page.filePath,
              ),
            );
          }
          if (
            !document.querySelector('meta[charset]') ||
            !document.querySelector('meta[name="viewport"]') ||
            document.documentElement.lang !== 'en'
          ) {
            findings.push(
              finding(
                'H02',
                Severity.Error,
                policy.path,
                AuditStage.Html,
                'Missing charset, viewport or English language',
                'valid shared document head',
                page.filePath,
              ),
            );
          }
          findings.push(...inspectSchema(document, policy.path));
          for (const element of document.querySelectorAll(
            'script[src], link[rel="stylesheet"][href], img[src], a[download][href]',
          )) {
            const raw =
              element.getAttribute('src') ?? element.getAttribute('href')!;
            const url = documentUrl(
              document,
              raw,
              productionOrigin + policy.path,
            );
            if (url.origin === productionOrigin) {
              assets.add(url.pathname);
              if (!robotsAccess(robots, url.pathname, 'Googlebot')) {
                findings.push(
                  finding(
                    'I04',
                    Severity.Error,
                    policy.path,
                    AuditStage.Html,
                    url.href,
                    'crawlable first-party resource',
                    page.filePath,
                  ),
                );
              }
            }
            if (element.tagName === 'IMG' && !element.hasAttribute('alt')) {
              findings.push(
                finding(
                  'P01',
                  Severity.Warning,
                  policy.path,
                  AuditStage.Html,
                  raw,
                  'meaningful alt or explicit decorative alt',
                  page.filePath,
                ),
              );
            }
          }
          return {
            url: productionOrigin + policy.path,
            selector,
            disposition: policy.disposition,
            sitemap: policy.disposition === RouteDisposition.Indexable,
            title: document.title,
            h1: document.querySelector('h1')?.textContent?.trim(),
            initialHtml: true,
          };
        }),
      );
    }
    for (const asset of assets) {
      try {
        const path = resolve(outputDirectory, '.' + asset);
        if (!path.startsWith(outputDirectory + '/')) {
          throw new Error('Asset escapes build root');
        }
        await access(path);
        if (
          /\.(?:js|css)$/.test(asset) &&
          /^(?:\s*<!doctype|\s*<html)/i.test(
            (await readFile(path, 'utf8')).slice(0, 100),
          )
        ) {
          throw new Error('HTML fallback instead of JS/CSS');
        }
      } catch (error) {
        findings.push(
          finding(
            'L04',
            Severity.Error,
            asset,
            AuditStage.Html,
            String(error),
            'existing resource of the promised type',
            relative(process.cwd(), outputDirectory),
          ),
        );
      }
    }
    complete = rows.length === routeSearchPolicy.length;
  } catch (error) {
    findings.push(
      finding(
        'R06',
        Severity.Unknown,
        '/',
        AuditStage.Html,
        String(error),
        'complete build and supported audit environment',
      ),
    );
  }
  const result = {
    stage: AuditStage.Html,
    complete,
    expected: routeSearchPolicy.length,
    attempted: rows.length,
    completed: rows.length,
    sourceSha256,
    artifactSha256,
    elapsedMs: Math.round(performance.now() - started),
    rows,
    findings,
  };
  await writeReport('html', result);
  return result;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const report = await auditHtml();
  process.exitCode = !report.complete
    ? 2
    : report.findings.some((f) => f.severity === Severity.Error)
      ? 1
      : 0;
}
