import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExamplesPage } from './examples-page';
import { publicExamples } from './example-registry';
import { GuideRouteUrl } from '../../core/seo/guide-routes';

describe('ExamplesPage layout and discovery', () => {
  it('keeps hardware interpretation links on the relevant existing controls', () => {
    TestBed.configureTestingModule({
      imports: [ExamplesPage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ExamplesPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    for (const [id, route] of [
      ['feature-bore', GuideRouteUrl.Route3dPrintScrewHoleSizing],
      [
        'changed-square-hole',
        GuideRouteUrl.RouteCounterboreVsCountersink3dPrinting,
      ],
      ['alignment-coupon', GuideRouteUrl.RouteCaptiveNutPockets3dPrinting],
    ]) {
      expect(host.querySelector(`#${id} a[href="${route}"]`)).not.toBeNull();
    }
    expect(
      host.querySelector(
        '#feature-angle ul[aria-label="Related interface decisions"]',
      ),
    ).toBeNull();
  });
  it('keeps every example in one continuous grid with its category badge and stable anchor', () => {
    TestBed.configureTestingModule({
      imports: [ExamplesPage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ExamplesPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const grids = host.querySelectorAll('.example-grid');
    expect(grids).toHaveLength(1);
    const cards = Array.from(grids[0].children);
    expect(cards).toHaveLength(publicExamples.length);
    const byId = new Map(
      publicExamples.map((example) => [example.id, example]),
    );
    for (const card of cards) {
      const example = byId.get(card.id)!;
      expect(card.matches('article.card')).toBe(true);
      expect(card.querySelector('.example-category')?.textContent?.trim()).toBe(
        example.group,
      );
      expect(card.querySelector('h2')?.textContent?.trim()).toBe(example.name);
      expect(card.querySelectorAll('a[download]')).toHaveLength(
        example.files.length,
      );
    }
    expect(new Set(cards.map((card) => card.id)).size).toBe(
      publicExamples.length,
    );
    const topics = Array.from(
      host.querySelectorAll('nav[aria-label="Example topics"] a'),
    );
    expect(topics).toHaveLength(
      new Set(publicExamples.map((example) => example.group)).size,
    );
    for (const topic of topics) {
      const url = new URL(
        topic.getAttribute('href')!,
        'https://www.inspectmesh.com',
      );
      const target = cards.find((card) => card.id === url.hash.slice(1));
      expect(target).toBeDefined();
      expect(
        target?.querySelector('.example-category')?.textContent?.trim(),
      ).toBe(topic.textContent?.trim());
    }
  });
});
