import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { ExampleLoader, fetchPublicExample } from './example-loader';
import { publicExamples } from './example-registry';

describe('explicit public example loading', () => {
  afterEach(() => vi.unstubAllGlobals());
  const viewerAsset = publicExamples
    .find((example) => example.tools.includes(PublicRouteUrl.Viewer))!
    .files.find((asset) => asset.name.endsWith('.stl'))!;
  const setup = (tool: string = PublicRouteUrl.Viewer) => {
    TestBed.configureTestingModule({
      imports: [ExampleLoader],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: () => 'https://private.invalid/model.stl' },
            },
          },
        },
        { provide: AnalyticsService, useValue: { trackWorkflow: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ExampleLoader);
    const load = vi.fn().mockResolvedValue(undefined);
    fixture.componentRef.setInput('tool', tool);
    fixture.componentRef.setInput('load', load);
    return { fixture, load };
  };
  it('never fetches an arbitrary URL or silently loads the query parameter', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const { fixture } = setup();
    fixture.detectChanges();
    expect(fetcher).not.toHaveBeenCalled();
    await expect(
      fetchPublicExample(
        'https://private.invalid/model.stl',
        PublicRouteUrl.Viewer,
        0,
      ),
    ).rejects.toThrow('listed public example');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('announces replacement and awaits the real tool callback', async () => {
    const { fixture, load } = setup();
    fixture.componentRef.setInput('active', true);
    const asset = viewerAsset;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(new Uint8Array(asset.bytes))),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Preserve any unsaved output first',
    );
    await fixture.componentInstance.open();
    expect(load).toHaveBeenCalledOnce();
    expect(load.mock.calls[0][0][0].name).toBe(asset.name);
    expect(fixture.componentInstance.status()).toContain('opened locally');
  });
  it('preserves a new visitor selection made during the download', async () => {
    const { fixture, load } = setup();
    let finish!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const run = fixture.componentInstance.open();
    fixture.componentRef.setInput(
      'current',
      new File(['private'], 'private.stl'),
    );
    finish(new Response(new Uint8Array(viewerAsset.bytes)));
    await run;
    expect(load).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error()).toContain(
      'changed during download',
    );
  });
  it('reports incomplete download and actual tool failures without a completed result', async () => {
    const { fixture, load } = setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('short')));
    await fixture.componentInstance.open();
    expect(load).not.toHaveBeenCalled();
    expect(fixture.componentInstance.loaded()).toBe(false);
    expect(fixture.componentInstance.error()).toContain('incomplete');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(new Uint8Array(viewerAsset.bytes))),
    );
    load.mockRejectedValueOnce(new Error('Actual tool failed'));
    await fixture.componentInstance.open();
    expect(fixture.componentInstance.loaded()).toBe(false);
    expect(fixture.componentInstance.error()).toBe('Actual tool failed');
    expect(fixture.componentInstance.status()).toBe('');
  });

  it('offers topology controls without replacing the quality four-file scenario', async () => {
    const quality = publicExamples.find(
      (item) => item.id === 'quality-control-selection',
    )!;
    expect(quality.files).toHaveLength(4);
    expect(quality.tools).toContain(PublicRouteUrl.QualityCheck);
    expect(quality.tools).not.toContain(PublicRouteUrl.ManifoldChecker);

    const { fixture, load } = setup(PublicRouteUrl.ManifoldChecker);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.choices().map((item) => item.id)).toEqual([
      'topology-edge-controls',
    ]);
    expect(component.selected().guide).toBe(
      '/guides/what-is-non-manifold-geometry',
    );
    const assets = component.selected().files;
    expect(assets.map((asset) => asset.label)).toEqual([
      'Missing face',
      'Duplicate face',
      'Two separate closed cubes',
    ]);
    expect(fixture.nativeElement.textContent).not.toContain('malformed.stl');

    for (const [index, asset] of assets.entries()) {
      const select = fixture.nativeElement.querySelectorAll(
        'select',
      )[1] as HTMLSelectElement;
      select.value = String(index);
      select.dispatchEvent(new Event('change'));
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(new Uint8Array(asset.bytes))),
      );
      await component.open();
      fixture.detectChanges();
      expect(load.mock.lastCall?.[0][0].name).toBe(asset.name);
      expect(fixture.nativeElement.textContent).toContain(asset.reference);
    }
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a'),
    ) as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toContain(
      '/examples#topology-edge-controls',
    );
    expect(links.map((link) => link.getAttribute('href'))).toContain(
      '/guides/what-is-non-manifold-geometry',
    );
  });
});
