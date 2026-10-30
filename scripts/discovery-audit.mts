import { withHtmlDocument } from './html-document.mts';
import {
  discoveryTasks,
  priorityDiscoveryPaths,
} from '../src/content/guides/guide-clusters.mts';
import { guideRegistry } from '../src/content/guides/guides.registry.ts';
import {
  PublicRouteUrl,
  guideRoutePath,
} from '../src/app/core/seo/public-routes.ts';
import { type SitemapEntry } from './route-coverage.mts';
import { type GeneratedPage } from './check-internal-links.mts';
import { documentUrl } from './document-urls.mts';
import {
  productionOrigin,
  routeSearchPolicy,
  RouteDisposition,
  type RouteSearchPolicy,
} from './route-search-policy.mts';
import { retiredRoutes } from './retired-routes.mts';

export const LinkKind = {
  Navigation: 'navigation',
  Hub: 'hub-or-directory',
  Contextual: 'contextual',
} as const;
const hubs = new Set<string>([
  PublicRouteUrl.AllTools,
  PublicRouteUrl.Guides,
  PublicRouteUrl.Tools,
  PublicRouteUrl.ThreeMfTools,
  PublicRouteUrl.Materials,
  PublicRouteUrl.Printers,
]);
const cleanText = (value: string | null | undefined) =>
  (value ?? '').replace(/\s+/g, ' ').trim();

/** Directory cards and global navigation never replace a contextual relationship. */
export function discoveryLinks(page: GeneratedPage) {
  return withHtmlDocument(page.html, (document) => {
    return [...document.querySelectorAll('a[href]')].flatMap((element) => {
      if (element.hasAttribute('download')) {
        return [];
      }
      const href = element.getAttribute('href')!;
      let url: URL;
      try {
        url = documentUrl(document, href, productionOrigin + page.route);
      } catch {
        return [];
      }
      if (url.origin !== productionOrigin) {
        return [];
      }
      const directory = element.closest(
        '.tool-card, .guide-list, app-format-tools-grid',
      );
      const navigation = element.closest(
        'nav, header, footer, app-workflow-paths',
      );
      const kind = directory
        ? LinkKind.Hub
        : navigation || !element.closest('main')
          ? LinkKind.Navigation
          : LinkKind.Contextual;
      return [
        {
          source: page.route,
          sourceLocation: `${page.filePath}: a[href=${JSON.stringify(href)}]`,
          target: url.pathname,
          href,
          query: url.search,
          fragment: url.hash,
          anchor: cleanText(element.textContent),
          kind,
          hub: hubs.has(page.route),
        },
      ];
    });
  });
}

export function breadcrumbConsistency(page: GeneratedPage): string[] {
  return withHtmlDocument(page.html, (document) => {
    const nav = document.querySelector('nav[aria-label="Breadcrumb"]');
    const visible = nav
      ? [...nav.querySelectorAll('a, [aria-current="page"]')].map(
          (element) => ({
            name: cleanText(element.textContent),
            item: new URL(
              element.getAttribute('href') ?? page.route,
              productionOrigin,
            ).href,
          }),
        )
      : [];
    const structured: { name?: string; item?: string; position?: number }[][] =
      [];
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      const row = value as Record<string, unknown>;
      if (
        row['@type'] === 'BreadcrumbList' &&
        Array.isArray(row['itemListElement'])
      ) {
        structured.push(row['itemListElement']);
      }
      Object.values(row).forEach(visit);
    };
    for (const script of document.querySelectorAll(
      'script[type="application/ld+json"]',
    )) {
      try {
        visit(JSON.parse(script.textContent ?? ''));
      } catch {
        return [`${page.route}: invalid JSON-LD while comparing breadcrumbs`];
      }
    }
    if (!visible.length && !structured.length) {
      return [];
    }
    const expected = visible.map((entry, index) => ({
      ...entry,
      position: index + 1,
    }));
    if (
      structured.length !== 1 ||
      JSON.stringify(
        structured[0].map((entry) => ({
          name: entry.name,
          item: entry.item,
          position: entry.position,
        })),
      ) !== JSON.stringify(expected)
    ) {
      return [`${page.route}: visible breadcrumbs and JSON-LD differ`];
    }
    return [];
  });
}

export function auditDiscovery(
  pages: readonly GeneratedPage[],
  entries: readonly SitemapEntry[],
  policies: readonly RouteSearchPolicy[] = routeSearchPolicy,
  priorities: readonly string[] = priorityDiscoveryPaths,
) {
  const failures: string[] = [];
  const links = pages.flatMap(discoveryLinks);
  const documents = new Map(pages.map((page) => [page.route, page]));
  const depths = new Map<string, number>([['/', 0]]);
  const queue = ['/'];
  for (let index = 0; index < queue.length; index++) {
    const source = queue[index];
    for (const link of links.filter((entry) => entry.source === source)) {
      if (documents.has(link.target) && !depths.has(link.target)) {
        depths.set(link.target, depths.get(source)! + 1);
        queue.push(link.target);
      }
    }
  }
  for (const page of pages) {
    failures.push(...breadcrumbConsistency(page));
  }
  for (const policy of retiredRoutes) {
    if (
      documents.has(policy.path) ||
      entries.some((entry) => entry.loc === productionOrigin + policy.path)
    ) {
      failures.push(
        `Obsolete artifact in current build/sitemap: ${policy.path}`,
      );
    }
    for (const link of links.filter((entry) => entry.target === policy.path)) {
      failures.push(
        `Stale retired link: ${link.sourceLocation} -> ${link.href}`,
      );
    }
  }
  const rows = policies.map((policy) => {
    const incoming = links.filter(
      (entry) => entry.target === policy.path && entry.source !== policy.path,
    );
    const contextual = incoming.filter(
      (entry) => entry.kind === LinkKind.Contextual && !hubs.has(entry.source),
    );
    const directory = incoming.filter(
      (entry) => entry.kind === LinkKind.Hub || entry.hub,
    );
    const nav = incoming.filter((entry) => entry.kind === LinkKind.Navigation);
    if (
      policy.disposition === RouteDisposition.Indexable &&
      !depths.has(policy.path)
    ) {
      failures.push(`Unreachable initial-HTML route: ${policy.path}`);
    }
    if (priorities.includes(policy.path) && !contextual.length) {
      failures.push(
        `Priority page has no contextual inbound content relationship: ${policy.path}`,
      );
    }
    if (
      policies.some((entry) => entry.path === PublicRouteUrl.AllTools) &&
      policy.path.startsWith('/tools/') &&
      policy.path !== PublicRouteUrl.Tools &&
      policy.path !== PublicRouteUrl.ThreeMfTools &&
      !links.some(
        (link) =>
          link.source === PublicRouteUrl.AllTools &&
          link.target === policy.path,
      )
    ) {
      failures.push(
        `Tool absent from complete initial-HTML directory: ${policy.path}`,
      );
    }
    const hub = policy.path.startsWith('/tools/stl-')
      ? PublicRouteUrl.Tools
      : policy.path.startsWith('/tools/3mf-')
        ? PublicRouteUrl.ThreeMfTools
        : null;
    if (hub && hub !== policy.path) {
      if (
        !links.some(
          (link) => link.source === hub && link.target === policy.path,
        )
      ) {
        failures.push(
          `Format hub omits current tool: ${hub} -> ${policy.path}`,
        );
      }
      if (
        !links.some(
          (link) => link.source === policy.path && link.target === hub,
        )
      ) {
        failures.push(
          `Tool has no visible return to format hub: ${policy.path} -> ${hub}`,
        );
      }
    }
    const task = discoveryTasks.find((task) =>
      [
        ...task.tools,
        guideRoutePath(task.primaryGuide),
        guideRoutePath(task.supportingGuide),
      ].some((path) => path === policy.path),
    );
    const page = documents.get(policy.path);
    const canonical =
      page?.html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1] ??
      null;
    return {
      currentPath: policy.path,
      routeKind: policy.pageType,
      expectedStatus: policy.expectedStatus,
      intendedCanonical: policy.canonical,
      observedStatus: 'NOT_OBSERVED',
      observedCanonical: canonical,
      inSitemap: entries.some((entry) => entry.loc === policy.canonical),
      reachableFromHome: depths.has(policy.path),
      depth: depths.get(policy.path) ?? null,
      hubInlinks: [...new Set(directory.map((entry) => entry.source))],
      navigationInlinks: [...new Set(nav.map((entry) => entry.source))],
      contextualInlinks: [...new Set(contextual.map((entry) => entry.source))],
      priority: priorities.includes(policy.path),
      clusterId: task?.id ?? null,
      verificationState: page ? 'BUILT_INITIAL_HTML' : 'MISSING_BUILD',
      depthException:
        (depths.get(policy.path) ?? 0) > 3
          ? 'Review useful navigation; depth exceeds local three-link target.'
          : null,
    };
  });
  for (const guide of guideRegistry.filter(
    (guide) =>
      guide.enabled &&
      guide.publishDate <= new Date().toISOString().slice(0, 10),
  )) {
    const path = guideRoutePath(guide.slug);
    if (
      policies.some((policy) => policy.path === path) &&
      !links.some(
        (link) => link.source === PublicRouteUrl.Guides && link.target === path,
      )
    ) {
      failures.push(`Guide absent from unfiltered initial HTML: ${path}`);
    }
  }
  return {
    rows,
    links,
    retirements: retiredRoutes,
    failures,
    limitation:
      'Local build graph and initial HTML. HTTP status and Google indexing are NOT_OBSERVED.',
  };
}
