import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  provideRouter,
  Router,
  UrlSegment,
  type PartialMatchRouteSnapshot,
} from '@angular/router';
import { routes } from '../../app.routes';
import { SEO_CONFIG } from '../../core/seo/seo-config';
import { guideCanMatch } from './guide-route';

describe('guide route matching', () => {
  it('matches an enabled guide from the generated catalogue', () => {
    expect(
      guideCanMatch(
        {},
        [
          new UrlSegment('guides', {}),
          new UrlSegment('how-to-fix-non-manifold-stl', {}),
        ],
        {} as PartialMatchRouteSnapshot,
      ),
    ).toBe(true);
  });

  it('declines an unpublished guide route so the normal 404 route handles it', () => {
    expect(
      guideCanMatch(
        {},
        [new UrlSegment('guides', {}), new UrlSegment('disabled-guide', {})],
        {} as PartialMatchRouteSnapshot,
      ),
    ).toBe(false);
  });

  it.each([
    ['how-to-fix-non-manifold-stl'],
    ['guide', 'how-to-fix-non-manifold-stl'],
    ['guides', 'how-to-fix-non-manifold-stl', 'extra'],
  ])('rejects a guide outside the exact /guides/ path: %s', (...parts) => {
    expect(
      guideCanMatch(
        {},
        parts.map((part) => new UrlSegment(part, {})),
        {} as PartialMatchRouteSnapshot,
      ),
    ).toBe(false);
  });
});

describe('guide URL navigation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: SEO_CONFIG,
          useValue: {
            siteUrl: 'https://www.inspectmesh.com',
            indexingEnabled: true,
          },
        },
      ],
    });
  });

  it('loads nested guides and updates content and canonical when navigating between them', async () => {
    const harness = await RouterTestingHarness.create(
      '/guides/how-to-fix-non-manifold-stl',
    );
    const firstHeading =
      harness.routeNativeElement?.querySelector('h1')?.textContent;
    expect(firstHeading).toContain('Non-Manifold');
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://www.inspectmesh.com/guides/how-to-fix-non-manifold-stl');
    await harness.navigateByUrl('/guides/how-to-repair-an-stl-file');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(
      'How to Repair an STL File for 3D Printing',
    );
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://www.inspectmesh.com/guides/how-to-repair-an-stl-file');
  });

  it.each([
    '/how-to-fix-non-manifold-stl',
    '/guide/how-to-fix-non-manifold-stl',
    '/3d-printing-materials',
    '/guides/unpublished-guide',
  ])('renders the not-found page without redirecting %s', async (path) => {
    const harness = await RouterTestingHarness.create(path);
    expect(TestBed.inject(Router).url).toBe(path);
    expect(harness.routeNativeElement?.matches('app-not-found-page')).toBe(
      true,
    );
    expect(
      document.querySelector('meta[name="robots"]')?.getAttribute('content'),
    ).toBe('noindex, nofollow');
  });
});
