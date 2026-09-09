import { guideBreadcrumbLabelBySlug } from '../../features/guides/guide-route-data.generated';
import { HOME_TOOL_GROUPS } from '../../features/home/home-tools';
import { PublicRouteUrl } from './public-routes';

export interface Breadcrumb {
  readonly href: string;
  readonly label: string;
}

export const BREADCRUMB_PRODUCTION_ORIGIN = 'https://www.inspectmesh.com';

const toolGroups = {
  stl: {
    label: 'STL tools',
    href: PublicRouteUrl.Tools,
    tools:
      HOME_TOOL_GROUPS.find((group) => group.id === 'stl-tools')?.tools ?? [],
  },
  threeMf: {
    label: '3MF tools',
    href: PublicRouteUrl.ThreeMfTools,
    tools:
      HOME_TOOL_GROUPS.find((group) => group.id === '3mf-tools')?.tools ?? [],
  },
} as const;

const toolBreadcrumbs = new Map(
  Object.values(toolGroups).flatMap((group) =>
    group.tools.map((tool) => [
      tool.route,
      { label: tool.title, groupLabel: group.label, groupHref: group.href },
    ]),
  ),
);

export function breadcrumbsForPath(path: string): readonly Breadcrumb[] {
  const normalizedPath = path.split(/[?#]/, 1)[0] || '/';
  if (normalizedPath === PublicRouteUrl.Tools) {
    return [
      { label: 'All 3D tools', href: PublicRouteUrl.AllTools },
      { label: 'STL tools', href: PublicRouteUrl.Tools },
    ];
  }
  if (normalizedPath === PublicRouteUrl.ThreeMfTools) {
    return [
      { label: 'All 3D tools', href: PublicRouteUrl.AllTools },
      { label: '3MF tools', href: PublicRouteUrl.ThreeMfTools },
    ];
  }

  const tool = toolBreadcrumbs.get(normalizedPath);
  if (tool) {
    return [
      { label: 'All 3D tools', href: PublicRouteUrl.AllTools },
      { label: tool.groupLabel, href: tool.groupHref },
      { label: tool.label, href: normalizedPath },
    ];
  }

  if (normalizedPath === PublicRouteUrl.PrintCostCalculator) {
    return [
      { label: 'All 3D tools', href: PublicRouteUrl.AllTools },
      {
        label: '3D Print Cost Calculator',
        href: PublicRouteUrl.PrintCostCalculator,
      },
    ];
  }
  if (normalizedPath === PublicRouteUrl.ToleranceCalculator) {
    return [
      { label: 'All 3D tools', href: PublicRouteUrl.AllTools },
      {
        label: '3D Print Tolerance & Clearance Calculator',
        href: PublicRouteUrl.ToleranceCalculator,
      },
    ];
  }

  const guideHeading = guideBreadcrumbLabelBySlug[normalizedPath.slice(1)];
  if (guideHeading) {
    return [
      { label: 'Guides', href: PublicRouteUrl.Guides },
      { label: guideHeading, href: normalizedPath },
    ];
  }

  return [];
}

export function breadcrumbStructuredData(
  breadcrumbs: readonly Breadcrumb[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: breadcrumb.label,
      item: `${BREADCRUMB_PRODUCTION_ORIGIN}${breadcrumb.href}`,
    })),
  };
}
