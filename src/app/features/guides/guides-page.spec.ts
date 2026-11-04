import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { guideIndexGroups } from './generated/guides.generated';
import { GuidesPage } from './guides-page';

describe('GuidesPage search and supporting guidance', () => {
  afterEach(() => TestBed.resetTestingModule());

  function renderPage() {
    TestBed.configureTestingModule({
      imports: [GuidesPage],
      providers: [
        provideRouter([]),
        { provide: SeoService, useValue: { apply: () => {} } },
      ],
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
    const panel = page.querySelector<HTMLDetailsElement>(
      '.guide-support details',
    )!;
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
      '1 of ',
    );
    expect(page.querySelectorAll('.guide-support details')).toHaveLength(6);
    expect(panel.open).toBe(true);

    page.querySelector<HTMLButtonElement>('.clear-filters')!.click();
    fixture.detectChanges();
    expect(input.value).toBe('');
    expect(page.querySelectorAll('.guide-list li')).toHaveLength(
      guideIndexGroups.flatMap((group) => group.guides).length,
    );
    expect(panel.open).toBe(true);
    panel.querySelector('summary')!.click();
    expect(panel.open).toBe(false);
  });

  it('combines category, topic tags and text while keeping guide links available when descriptions are closed', () => {
    const { fixture, page } = renderPage();
    const filtersToggle = page.querySelector<HTMLButtonElement>(
      '.guide-filters-toggle',
    )!;
    expect(filtersToggle.getAttribute('aria-expanded')).toBe('false');
    filtersToggle.click();
    fixture.detectChanges();
    expect(filtersToggle.getAttribute('aria-expanded')).toBe('true');

    const tagButtons = [
      ...page.querySelectorAll<HTMLButtonElement>(
        '.guide-tag-filters [aria-pressed]',
      ),
    ];
    const clearTopics = page.querySelector<HTMLButtonElement>(
      '.guide-tag-filters .filter-reset',
    )!;
    expect(clearTopics.getAttribute('aria-disabled')).toBe('true');
    const calibration = tagButtons.find(
      (button) =>
        button.textContent?.trim() === 'Functional fit and calibration',
    )!;
    const [otherTag] = tagButtons;
    calibration.click();
    otherTag.click();
    fixture.detectChanges();
    expect(
      [...page.querySelectorAll('.guide-results section > h2')].map((heading) =>
        heading.textContent?.trim(),
      ),
    ).toEqual([otherTag.textContent?.trim(), calibration.textContent?.trim()]);
    expect(calibration.getAttribute('aria-pressed')).toBe('true');
    expect(otherTag.getAttribute('aria-pressed')).toBe('true');
    expect(clearTopics.getAttribute('aria-disabled')).toBe('false');
    otherTag.click();

    const category = page.querySelector<HTMLSelectElement>('select')!;
    category.value = 'calibration';
    category.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(otherTag.getAttribute('aria-pressed')).toBe('false');

    const query = page.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(page.querySelectorAll('.guide-list li').length).toBeGreaterThan(1);
    query.value = 'screw passage sizing';
    query.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const card = page.querySelector('.guide-list li')!;
    const description = card.querySelector('p')!;
    const descriptionToggle = card.querySelector('button')!;
    expect(page.querySelectorAll('.guide-list li')).toHaveLength(1);
    expect(
      card.querySelector('.guide-card-title a')?.getAttribute('href'),
    ).toBe('/guides/3d-print-screw-hole-sizing');
    expect(descriptionToggle.getAttribute('aria-controls')).toBe(
      description.id,
    );
    expect(descriptionToggle.getAttribute('aria-expanded')).toBe('false');
    expect(description.hidden).toBe(true);
    descriptionToggle.click();
    fixture.detectChanges();
    expect(descriptionToggle.getAttribute('aria-expanded')).toBe('true');
    expect(description.hidden).toBe(false);
    descriptionToggle.click();
    fixture.detectChanges();
    expect(description.hidden).toBe(true);

    filtersToggle.click();
    fixture.detectChanges();
    expect(filtersToggle.getAttribute('aria-expanded')).toBe('false');
    expect(category.value).toBe('calibration');
    expect(calibration.getAttribute('aria-pressed')).toBe('true');

    query.value = 'truncated STL';
    query.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(page.querySelector('.guide-empty')).not.toBeNull();

    filtersToggle.click();
    fixture.detectChanges();
    clearTopics.click();
    fixture.detectChanges();
    expect(calibration.getAttribute('aria-pressed')).toBe('false');
    expect(clearTopics.getAttribute('aria-disabled')).toBe('true');
    expect([query.value, category.value]).toEqual([
      'truncated STL',
      'calibration',
    ]);

    calibration.click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.clear-filters')!.click();
    fixture.detectChanges();
    expect([query.value, category.value]).toEqual(['', '']);
    expect(calibration.getAttribute('aria-pressed')).toBe('false');
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
