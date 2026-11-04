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
    const topics = [
      ...host.querySelectorAll<HTMLButtonElement>(
        '.filter-buttons [aria-pressed]',
      ),
    ];
    expect(topics).toHaveLength(
      new Set(publicExamples.map((example) => example.group)).size,
    );
    let halfWidthCards = 0;
    for (const card of cards) {
      if (card.classList.contains('example-wide')) {
        expect(halfWidthCards % 2).toBe(0);
        expect(card.querySelector('.path-scroll')).not.toBeNull();
      } else {
        expect(card.querySelector('.path-scroll')).toBeNull();
        halfWidthCards++;
      }
    }

    const selectedTopics = topics.slice(0, 2);
    for (const topic of selectedTopics) {
      topic.click();
      fixture.detectChanges();
      expect(topic.getAttribute('aria-pressed')).toBe('true');
    }
    const selectedGroups = selectedTopics.map((topic) =>
      topic.textContent?.trim(),
    );
    expect([...grids[0].children].map((card) => card.id).sort()).toEqual(
      publicExamples
        .filter((example) => selectedGroups.includes(example.group))
        .map((example) => example.id)
        .sort(),
    );

    selectedTopics[0].click();
    fixture.detectChanges();
    expect(selectedTopics[0].getAttribute('aria-pressed')).toBe('false');
    expect(
      [...grids[0].children].every(
        (card) => byId.get(card.id)?.group === selectedGroups[1],
      ),
    ).toBe(true);

    host
      .querySelector<HTMLButtonElement>('.filter-buttons button:last-child')!
      .click();
    fixture.detectChanges();
    expect(grids[0].children).toHaveLength(publicExamples.length);
  });
});
