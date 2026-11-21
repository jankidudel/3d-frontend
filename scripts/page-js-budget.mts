import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

/**
 * Upper bound for the gzip-compressed JavaScript a prerendered page loads
 * before any interaction: its module entry script plus every modulepreload.
 * Pages measured 144-211 KiB when this budget was set. Bundling three.js
 * (~150 KiB) or the full guide catalogue (~280 KiB) into a landing page
 * exceeds it, which is the regression this check exists to catch.
 */
export const PAGE_JS_BUDGET_BYTES = 240 * 1024;

const scriptReference =
  /<(?:script\b[^>]*\bsrc|link\b[^>]*\brel="modulepreload"[^>]*\bhref)="([^"]+\.m?js)"/g;

/** First-party JS files the browser fetches up front for one HTML page. */
export function initialScripts(html: string): string[] {
  const files = new Set<string>();
  for (const match of html.matchAll(scriptReference)) {
    const reference = match[1];
    if (/^(?:https?:)?\/\//.test(reference)) {
      continue;
    }
    files.add(reference.replace(/^\.?\//, ''));
  }
  return [...files].sort();
}

export interface PageJsWeight {
  readonly page: string;
  readonly gzipBytes: number;
  readonly scripts: readonly string[];
}

export async function measurePages(
  browserDirectory: string,
): Promise<PageJsWeight[]> {
  const sizes = new Map<string, number>();
  const gzipSize = async (file: string) => {
    let size = sizes.get(file);
    if (size === undefined) {
      size = gzipSync(await readFile(join(browserDirectory, file)), {
        level: 9,
      }).length;
      sizes.set(file, size);
    }
    return size;
  };
  const pages: PageJsWeight[] = [];
  for (const htmlFile of await htmlFiles(browserDirectory)) {
    const scripts = initialScripts(await readFile(htmlFile, 'utf8'));
    let gzipBytes = 0;
    for (const script of scripts) {
      gzipBytes += await gzipSize(script);
    }
    pages.push({
      page: '/' + relative(browserDirectory, htmlFile),
      gzipBytes,
      scripts,
    });
  }
  return pages.sort((a, b) => b.gzipBytes - a.gzipBytes);
}

export function overBudget(
  pages: readonly PageJsWeight[],
  budget = PAGE_JS_BUDGET_BYTES,
): PageJsWeight[] {
  return pages.filter((page) => page.gzipBytes > budget);
}

async function htmlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return htmlFiles(path);
      }
      return entry.name === 'index.html' ? [path] : [];
    }),
  );
  return nested.flat();
}

const kib = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`;

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const browserDirectory = resolve(
    import.meta.dirname,
    '..',
    'dist',
    '3d-frontend',
    'browser',
  );
  const pages = await measurePages(browserDirectory);
  if (!pages.length) {
    console.error(`No prerendered pages found in ${browserDirectory}.`);
    process.exit(2);
  }
  const failures = overBudget(pages);
  const heaviest = pages[0];
  console.log(
    `Initial JS budget ${kib(PAGE_JS_BUDGET_BYTES)} gzip: ${pages.length} pages, heaviest ${heaviest.page} at ${kib(heaviest.gzipBytes)}.`,
  );
  for (const page of failures) {
    console.error(
      `Over budget: ${page.page} loads ${kib(page.gzipBytes)} gzip JS up front (${page.scripts.join(', ')}).`,
    );
  }
  process.exitCode = failures.length ? 1 : 0;
}
