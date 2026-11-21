import { describe, expect, it } from 'vitest';
import {
  fileNameForPath,
  parseOptions,
  sitemapPaths,
} from './screenshots-live.mts';

describe('live screenshot capture helpers', () => {
  it('reads sitemap locations as origin-independent paths', () => {
    const xml = `<urlset>
      <url><loc>https://www.inspectmesh.com/</loc></url>
      <url><loc> https://www.inspectmesh.com/guides/stl-vs-3mf </loc></url>
    </urlset>`;
    expect(sitemapPaths(xml)).toEqual(['/', '/guides/stl-vs-3mf']);
  });

  it('names captures readably and never escapes the output folder', () => {
    expect(fileNameForPath('/')).toBe('home.png');
    expect(fileNameForPath('/tools/stl-viewer')).toBe('tools__stl-viewer.png');
    expect(fileNameForPath('/../../etc/passwd')).not.toContain('/');
  });

  it('defaults to production and accepts a local origin and filters', () => {
    expect(parseOptions([]).origin).toBe('https://www.inspectmesh.com');
    const options = parseOptions([
      '--origin',
      'http://localhost:4200/',
      '--limit',
      '3',
      '--match',
      '/guides',
    ]);
    expect(options).toMatchObject({
      origin: 'http://localhost:4200',
      limit: 3,
      match: '/guides',
    });
  });
});
