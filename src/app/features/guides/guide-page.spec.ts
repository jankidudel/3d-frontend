import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { SeoService } from '../../core/seo/seo.service';
import { GuidePage } from './guide-page';
import { guideBySlug } from './generated/guide-content-all.generated';

describe('guide evidence section rendering', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('retains safe lazy loading for opted-in diagrams through guide navigation', async () => {
    const initial = {
      guide: guideBySlug['counterbore-vs-countersink-3d-printing'],
    };
    const data = new BehaviorSubject(initial);
    TestBed.configureTestingModule({
      imports: [GuidePage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { data, snapshot: { data: initial } },
        },
        { provide: SeoService, useValue: { apply: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(GuidePage);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(
      page.querySelector('img.guide-lazy-image')?.getAttribute('loading'),
    ).toBe('lazy');
    data.next({ guide: guideBySlug['captive-nut-pockets-3d-printing'] });
    fixture.detectChanges();
    await fixture.whenStable();
    const image = page.querySelector('img.guide-lazy-image');
    expect(image?.getAttribute('src')).toContain('nut-pocket.svg');
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(page.querySelector('script')).toBeNull();
    data.next({ guide: guideBySlug['alignment-pins-for-split-3d-prints'] });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.querySelector('img')?.hasAttribute('loading')).toBe(false);
    data.complete();
  });

  for (const [slug, anchor] of [
    ['embossed-text-not-printing', 'guide-lettering-results'],
    ['vase-mode-vs-normal-printing', 'guide-vase-results'],
    ['missing-top-layers-in-slicer', 'guide-roof-results'],
    ['does-3mf-keep-colours-materials-and-settings', 'guide-project-state'],
    ['how-to-inspect-stl-3mf-cross-sections', 'guide-observed-clips'],
  ]) {
    it(`retains the incoming result anchor and full article for ${slug}`, () => {
      const initial = { guide: guideBySlug[slug] };
      TestBed.configureTestingModule({
        imports: [GuidePage],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: { data: of(initial), snapshot: { data: initial } },
          },
          { provide: SeoService, useValue: { apply: vi.fn() } },
        ],
      });
      const fixture = TestBed.createComponent(GuidePage);
      fixture.detectChanges();
      const page = fixture.nativeElement as HTMLElement;
      expect(page.querySelectorAll('h1')).toHaveLength(1);
      expect(page.querySelectorAll(`#${anchor}`)).toHaveLength(1);
      expect(page.querySelector(`#${anchor}`)?.tagName).toBe('H2');
      expect(page.querySelectorAll('.guide-body h2')).toHaveLength(
        (guideBySlug[slug].html.match(/<h2[ >]/g) ?? []).length,
      );
      expect(page.querySelectorAll('.guide-body table').length).toBeGreaterThan(
        0,
      );
      expect(
        page.querySelectorAll('.guide-table-scroll[tabindex="0"]').length,
      ).toBeGreaterThan(0);
      expect(page.querySelectorAll('.guide-body script')).toHaveLength(0);
      expect(page.textContent).not.toContain('{{');
      expect(page.textContent).not.toMatch(
        /First published|Substantially updated/,
      );
    });
  }
});
