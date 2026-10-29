import {
  BREADCRUMB_PRODUCTION_ORIGIN,
  breadcrumbStructuredData,
  breadcrumbsForPath,
} from './breadcrumbs';

describe('breadcrumbsForPath', () => {
  it('builds the visible STL repair trail with crawlable parent links', () => {
    const breadcrumbs = breadcrumbsForPath('/tools/stl-repair');

    expect(breadcrumbs).toEqual([
      { label: 'Home', href: '/' },
      { label: 'All 3D tools', href: '/tools' },
      { label: 'STL tools', href: '/tools/stl-tools' },
      { label: 'STL Repair Tool', href: '/tools/stl-repair' },
    ]);
    expect(breadcrumbs.slice(0, -1).every((item) => item.href)).toBe(true);
    expect(breadcrumbs.at(-1)?.href).toBe('/tools/stl-repair');
  });

  it('builds the 3MF manifold checker trail', () => {
    expect(breadcrumbsForPath('/tools/3mf-manifold-checker')).toEqual([
      { label: 'Home', href: '/' },
      { label: 'All 3D tools', href: '/tools' },
      { label: '3MF tools', href: '/tools/3mf-tools' },
      { label: '3MF Manifold Checker', href: '/tools/3mf-manifold-checker' },
    ]);
  });

  it('builds the 3MF print preflight trail and structured-data source', () => {
    const breadcrumbs = breadcrumbsForPath('/tools/3mf-print-preflight');

    expect(breadcrumbs).toEqual([
      { label: 'Home', href: '/' },
      { label: 'All 3D tools', href: '/tools' },
      { label: '3MF tools', href: '/tools/3mf-tools' },
      {
        label: '3MF Print Preflight Checker',
        href: '/tools/3mf-print-preflight',
      },
    ]);
    expect(breadcrumbStructuredData(breadcrumbs)).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          name: 'Home',
          item: 'https://www.inspectmesh.com/',
          position: 1,
        },
        expect.objectContaining({
          item: 'https://www.inspectmesh.com/tools',
        }),
        expect.objectContaining({
          item: 'https://www.inspectmesh.com/tools/3mf-tools',
        }),
        expect.objectContaining({
          item: 'https://www.inspectmesh.com/tools/3mf-print-preflight',
        }),
      ],
    });
  });

  it('keeps STL revision comparison under the real format hub', () => {
    expect(
      breadcrumbsForPath('/tools/stl-compare').map((item) => item.href),
    ).toEqual(['/', '/tools', '/tools/stl-tools', '/tools/stl-compare']);
  });

  it('builds the calculator trail directly from all 3D tools', () => {
    expect(breadcrumbsForPath('/tools/3d-print-cost-calculator')).toEqual([
      { label: 'Home', href: '/' },
      { label: 'All 3D tools', href: '/tools' },
      {
        label: '3D Print Cost Calculator',
        href: '/tools/3d-print-cost-calculator',
      },
    ]);
  });

  it('builds the tolerance calculator trail directly from all 3D tools', () => {
    expect(breadcrumbsForPath('/tools/3d-print-tolerance-calculator')).toEqual([
      { label: 'Home', href: '/' },
      { label: 'All 3D tools', href: '/tools' },
      {
        label: '3D Print Tolerance & Clearance Calculator',
        href: '/tools/3d-print-tolerance-calculator',
      },
    ]);
  });

  it('builds the orientation planner trail directly from all 3D tools', () => {
    expect(breadcrumbsForPath('/tools/3d-print-orientation-planner')).toEqual([
      { label: 'Home', href: '/' },
      { label: 'All 3D tools', href: '/tools' },
      {
        label: '3D Print Orientation Planner',
        href: '/tools/3d-print-orientation-planner',
      },
    ]);
  });

  it('builds the STL hub trail without linking its current item', () => {
    expect(breadcrumbsForPath('/tools/stl-tools')).toEqual([
      { label: 'Home', href: '/' },
      { label: 'All 3D tools', href: '/tools' },
      { label: 'STL tools', href: '/tools/stl-tools' },
    ]);
  });

  it('uses the guide heading as the guide breadcrumb label', () => {
    expect(breadcrumbsForPath('/guides/how-to-repair-an-stl-file')).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Guides', href: '/guides' },
      {
        label: 'How to Repair an STL File for 3D Printing',
        href: '/guides/how-to-repair-an-stl-file',
      },
    ]);
  });

  it('excludes pages without visible breadcrumbs', () => {
    for (const path of [
      '/',
      '/tools',
      '/guides',
      '/privacy',
      '/404',
      '/missing',
    ]) {
      expect(breadcrumbsForPath(path)).toEqual([]);
    }
  });

  it('uses visible names, positions, and production canonical URLs in JSON-LD', () => {
    const structuredData = breadcrumbStructuredData(
      breadcrumbsForPath('/tools/stl-repair'),
    );

    expect(structuredData).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          name: 'Home',
          item: 'https://www.inspectmesh.com/',
          position: 1,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'All 3D tools',
          item: `${BREADCRUMB_PRODUCTION_ORIGIN}/tools`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'STL tools',
          item: `${BREADCRUMB_PRODUCTION_ORIGIN}/tools/stl-tools`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'STL Repair Tool',
          item: `${BREADCRUMB_PRODUCTION_ORIGIN}/tools/stl-repair`,
        },
      ],
    });
  });

  it('uses matching two-item JSON-LD for the calculator trail', () => {
    expect(
      breadcrumbStructuredData(
        breadcrumbsForPath('/tools/3d-print-cost-calculator'),
      ),
    ).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          name: 'Home',
          item: 'https://www.inspectmesh.com/',
          position: 1,
        },
        {
          position: 2,
          name: 'All 3D tools',
          item: 'https://www.inspectmesh.com/tools',
        },
        {
          position: 3,
          name: '3D Print Cost Calculator',
          item: 'https://www.inspectmesh.com/tools/3d-print-cost-calculator',
        },
      ],
    });
  });
});
