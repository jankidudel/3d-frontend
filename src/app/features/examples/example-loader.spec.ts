import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { ExampleLoader, fetchPublicExample } from './example-loader';
import { publicExamples } from './example-registry';

describe('explicit public example loading', () => {
  afterEach(() => vi.unstubAllGlobals());
  const setup = () => {
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
    fixture.componentRef.setInput('tool', PublicRouteUrl.Viewer);
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
    const asset = publicExamples[0].files[0];
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
    finish(new Response(new Uint8Array(publicExamples[0].files[0].bytes)));
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
        .mockResolvedValue(
          new Response(new Uint8Array(publicExamples[0].files[0].bytes)),
        ),
    );
    load.mockRejectedValueOnce(new Error('Actual tool failed'));
    await fixture.componentInstance.open();
    expect(fixture.componentInstance.loaded()).toBe(false);
    expect(fixture.componentInstance.error()).toBe('Actual tool failed');
    expect(fixture.componentInstance.status()).toBe('');
  });
});
