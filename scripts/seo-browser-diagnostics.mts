import type { Finding } from './technical-seo.mts';

/** Evaluated in Chrome. Keep this probe self-contained and safe before DOM creation. */
export function browserSnapshot() {
  const main = document.querySelector('main');
  return {
    href: location.href,
    readyState: document.readyState,
    appReady: document.documentElement?.dataset['appReady'] ?? null,
    title: document.title,
    canonical:
      document.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
      null,
    headings: [...document.querySelectorAll('h1')].map(
      (element) => element.textContent?.trim() ?? '',
    ),
    noindex: [...document.querySelectorAll<HTMLMetaElement>('meta[name]')].some(
      (element) =>
        ['robots', 'googlebot'].includes(element.name.toLowerCase()) &&
        /(?:noindex|\bnone\b)/i.test(element.content),
    ),
    vitals: Reflect.get(window, '__seoVitals'),
    main: main?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    overflow:
      !!document.documentElement &&
      document.documentElement.scrollWidth > innerWidth + 1,
    viewport: {
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement?.scrollWidth ?? null,
    },
    images: [...document.images]
      .filter((element) => !element.complete || !element.naturalWidth)
      .map((element) => element.src),
    links: [...document.querySelectorAll('main a[href]')].map((element) =>
      element.getAttribute('href'),
    ),
  };
}
export const browserSnapshotExpression = `(${browserSnapshot.toString()})()`;

export function pageReadyExpression(path: string, selector: string): string {
  return `location.pathname===${JSON.stringify(path)} && document.documentElement?.dataset.appReady==='true' && !!document.querySelector(${JSON.stringify(selector)})`;
}

export function isNavigationContextError(error: unknown): boolean {
  return /Execution context was destroyed|Cannot find context with specified id|Inspected target navigated/i.test(
    String(error),
  );
}

/** Single-line evidence avoids multiline values becoming CI workflow commands. */
export function logBrowserFindings(
  findings: readonly Finding[],
  write: (line: string) => void = console.error,
): void {
  for (const item of findings) {
    if (item.severity === 'ERROR' || item.severity === 'UNKNOWN') {
      write(
        `[render:${item.rule}] ${item.severity} ${item.url} ${JSON.stringify({ observed: item.observed.slice(0, 6000), expected: item.expected, source: item.source })}`,
      );
    }
  }
}
