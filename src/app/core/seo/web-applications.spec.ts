import { toolDirectoryGroups } from '../../features/tools/tool-directory';
import { PublicRouteUrl } from './public-routes';
import { WEB_APPLICATIONS, webApplicationNode } from './web-applications';

describe('WEB_APPLICATIONS', () => {
  it('describes every tool listed in the tool directory', () => {
    const directoryRoutes = toolDirectoryGroups.flatMap((group) =>
      group.tools.map((tool) => tool.route),
    );
    const missing = directoryRoutes.filter((route) => !WEB_APPLICATIONS[route]);
    expect(missing).toEqual([]);
  });

  it('only describes tool routes', () => {
    const notTools = Object.keys(WEB_APPLICATIONS).filter(
      (route) => !route.startsWith(`${PublicRouteUrl.AllTools}/`),
    );
    expect(notTools).toEqual([]);
  });

  it('excludes hubs, which are not applications', () => {
    for (const hub of [
      PublicRouteUrl.AllTools,
      PublicRouteUrl.Tools,
      PublicRouteUrl.ThreeMfTools,
    ]) {
      expect(WEB_APPLICATIONS[hub]).toBeUndefined();
    }
  });

  it('builds a browser application node with the canonical URL', () => {
    expect(
      webApplicationNode(
        PublicRouteUrl.Viewer,
        'https://www.example.com/tools/stl-viewer',
        'Open an STL.',
      ),
    ).toEqual({
      '@type': 'WebApplication',
      name: 'Free STL Viewer Online',
      url: 'https://www.example.com/tools/stl-viewer',
      description: 'Open an STL.',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      publisher: {
        '@type': 'Organization',
        '@id': 'https://www.example.com/#organization',
        name: 'InspectMesh',
        url: 'https://www.example.com/',
      },
    });
    expect(
      webApplicationNode(
        PublicRouteUrl.Guides,
        'https://www.example.com/guides',
        'Guides.',
      ),
    ).toBeUndefined();
  });
});
