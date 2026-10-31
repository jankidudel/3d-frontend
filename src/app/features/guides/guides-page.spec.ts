import { TestBed } from '@angular/core/testing';
import { SeoService } from '../../core/seo/seo.service';
import { guideIndexGroups } from './generated/guides.generated';
import { GuidesPage } from './guides-page';

describe('GuidesPage search and supporting guidance', () => {
  afterEach(() => TestBed.resetTestingModule());

  function renderPage() {
    TestBed.configureTestingModule({
      imports: [GuidesPage],
      providers: [{ provide: SeoService, useValue: { apply: () => {} } }],
    });
    const fixture = TestBed.createComponent(GuidesPage);
    fixture.detectChanges();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  it('keeps the entire guide list immediately after search and all guidance collapsed below it', () => {
    const { page } = renderPage();
    const search = page.querySelector('.guide-search')!;
    const results = page.querySelector('.guide-results')!;
    const support = page.querySelector('.guide-support')!;

    expect(page.querySelector('h1')!.nextElementSibling).toBe(search);
    expect(search.nextElementSibling).toBe(results);
    expect(results.nextElementSibling).toBe(support);
    expect(results.querySelectorAll('.guide-list li')).toHaveLength(
      guideIndexGroups.flatMap((group) => group.guides).length,
    );
    expect(results.closest('details')).toBeNull();
    expect(
      [...support.querySelectorAll('summary')].map((heading) =>
        heading.textContent?.trim(),
      ),
    ).toEqual([
      'About these guides',
      'Browse by task',
      'Start with the problem you have',
      'Orientation, overhangs and support access',
      'After slicing: follow the finding',
      'Choose the question you need to answer',
    ]);
    expect(support.querySelectorAll('details[open]')).toHaveLength(0);
    const text = support.textContent!.replace(/\s+/g, ' ');
    expect(text).toContain(
      'Understand formats, inspect a file, diagnose a finding, correct geometry and plan the print. Choose the question you need to answer before changing the model.',
    );
    expect(text).toContain(
      'The readiness guide explains the decision. The checklist records it.',
    );
    expect(text).toContain(
      'The examples identify software fixtures and illustrative inputs; they do not imply physical product testing.',
    );
  });

  it('filters and clears results without resetting a deliberately expanded panel', () => {
    const { fixture, page } = renderPage();
    const panel = page.querySelector<HTMLDetailsElement>('details')!;
    panel.querySelector('summary')!.click();
    expect(panel.open).toBe(true);

    const input = page.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'truncated stl';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(page.querySelectorAll('.guide-list li')).toHaveLength(1);
    expect(
      page.querySelector('.guide-card-title a')?.getAttribute('href'),
    ).toBe('/guides/truncated-stl-file');
    expect(page.querySelector('#guide-search-status')?.textContent).toContain(
      '1 guide found',
    );
    expect(page.querySelectorAll('.guide-support details')).toHaveLength(6);
    expect(panel.open).toBe(true);

    page.querySelector<HTMLButtonElement>('.text-button')!.click();
    fixture.detectChanges();
    expect(input.value).toBe('');
    expect(page.querySelectorAll('.guide-list li')).toHaveLength(
      guideIndexGroups.flatMap((group) => group.guides).length,
    );
    expect(panel.open).toBe(true);
    panel.querySelector('summary')!.click();
    expect(panel.open).toBe(false);
  });

  it('places the no-match state before supporting guidance', () => {
    const { fixture, page } = renderPage();
    const input = page.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'zzzz-no-such-guide';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(page.querySelectorAll('.guide-list li')).toHaveLength(0);
    expect(
      page.querySelector('.guide-results .guide-empty h2')?.textContent,
    ).toBe('No matching guides');
    expect(page.querySelector('.guide-results')!.nextElementSibling).toBe(
      page.querySelector('.guide-support'),
    );
    expect(page.querySelectorAll('.guide-support details')).toHaveLength(6);
    expect(page.querySelectorAll('.guide-support details[open]')).toHaveLength(
      0,
    );
  });
});
