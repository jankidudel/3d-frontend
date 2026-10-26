import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ComparePage } from './compare-page';
import { ExampleLoader } from '../examples/example-loader';
import { publicExamples } from '../examples/example-registry';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import { exampleFile, exampleMesh, MeshExample } from './example-meshes';

describe('paired comparison example ownership', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('prioritises revision controls and preserves an After-only change during paired download', async () => {
    TestBed.configureTestingModule({
      imports: [ComparePage],
      providers: [
        provideRouter([]),
        { provide: AnalyticsService, useValue: { trackWorkflow: vi.fn() } },
        { provide: SeoService, useValue: { apply: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ComparePage);
    const page = fixture.componentInstance;
    const open = vi
      .spyOn(page, 'loadPublicExample')
      .mockResolvedValue(undefined);
    fixture.detectChanges();
    const loader = fixture.debugElement.query(By.directive(ExampleLoader))
      .componentInstance as ExampleLoader;
    expect(
      loader
        .choices()
        .slice(0, 3)
        .map((choice) => choice.id),
    ).toEqual([
      'revision-baselines',
      'changed-square-hole',
      'curve-approximation',
    ]);
    expect(loader.chosenIndex()).toBe(1);
    const example = publicExamples.find(
      (item) => item.id === 'revision-baselines',
    )!;
    const pending: (() => void)[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (path: string) =>
          new Promise<Response>((resolve) => {
            const asset = example.files.find((file) => file.path === path)!;
            pending.push(() =>
              resolve(new Response(new Uint8Array(asset.bytes))),
            );
          }),
      ),
    );
    const opening = loader.open();
    expect(pending).toHaveLength(2);
    const after = {
      file: exampleFile(MeshExample.Changed),
      mesh: exampleMesh(MeshExample.Changed),
      dimensions: { width: 24, height: 20, depth: 20 },
      area: 2720,
    };
    page.after.set(after);
    fixture.detectChanges();
    pending.forEach((finish) => finish());
    await opening;
    expect(open).not.toHaveBeenCalled();
    expect(page.after()).toBe(after);
    expect(loader.loaded()).toBe(false);
    expect(loader.error()).toContain('changed during download');
    fixture.destroy();
  });
});
