import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { SeoService } from '../../core/seo/seo.service';
import { GuidePage } from './guide-page';
import { guideBySlug } from './generated/guides.generated';

describe('guide evidence section rendering', () => {
  afterEach(() => TestBed.resetTestingModule());

  for (const [slug, anchor] of [
    ['embossed-text-not-printing', 'guide-lettering-results'],
    ['vase-mode-vs-normal-printing', 'guide-vase-results'],
    ['missing-top-layers-in-slicer', 'guide-roof-results'],
    ['does-3mf-keep-colours-materials-and-settings', 'guide-project-state'],
    ['how-to-inspect-stl-3mf-cross-sections', 'guide-observed-clips'],
  ]) {
    it(`retains the incoming result anchor and full article for ${slug}`, () => {
      const params = convertToParamMap({ guideSlug: slug });
      TestBed.configureTestingModule({
        imports: [GuidePage],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: { paramMap: of(params), snapshot: { paramMap: params } },
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
    });
  }
});
