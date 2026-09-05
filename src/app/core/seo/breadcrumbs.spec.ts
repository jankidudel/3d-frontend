import {
  BREADCRUMB_PRODUCTION_ORIGIN,
  breadcrumbStructuredData,
  breadcrumbsForPath,
} from './breadcrumbs';

describe('breadcrumbsForPath', () => {
  it('builds the visible STL repair trail with crawlable parent links', () => {
    const breadcrumbs = breadcrumbsForPath('/stl-repair');

    expect(breadcrumbs).toEqual([
      { label: 'All 3D tools', href: '/tools' },
      { label: 'STL tools', href: '/stl-tools' },
      { label: 'STL Repair Tool', href: '/stl-repair' },
    ]);
    expect(breadcrumbs.slice(0, -1).every((item) => item.href)).toBe(true);
    expect(breadcrumbs.at(-1)?.href).toBe('/stl-repair');
  });

  it('builds the 3MF manifold checker trail', () => {
    expect(breadcrumbsForPath('/3mf-manifold-checker')).toEqual([
      { label: 'All 3D tools', href: '/tools' },
      { label: '3MF tools', href: '/3mf-tools' },
      { label: '3MF Manifold Checker', href: '/3mf-manifold-checker' },
    ]);
  });

  it('builds the STL hub trail without linking its current item', () => {
    expect(breadcrumbsForPath('/stl-tools')).toEqual([
      { label: 'All 3D tools', href: '/tools' },
      { label: 'STL tools', href: '/stl-tools' },
    ]);
  });

  it('uses the guide heading as the guide breadcrumb label', () => {
    expect(breadcrumbsForPath('/how-to-repair-an-stl-file')).toEqual([
      { label: 'Guides', href: '/guides' },
      {
        label: 'How to Repair an STL File for 3D Printing',
        href: '/how-to-repair-an-stl-file',
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
      breadcrumbsForPath('/stl-repair'),
    );

    expect(structuredData).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'All 3D tools',
          item: `${BREADCRUMB_PRODUCTION_ORIGIN}/tools`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'STL tools',
          item: `${BREADCRUMB_PRODUCTION_ORIGIN}/stl-tools`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'STL Repair Tool',
          item: `${BREADCRUMB_PRODUCTION_ORIGIN}/stl-repair`,
        },
      ],
    });
  });
});
