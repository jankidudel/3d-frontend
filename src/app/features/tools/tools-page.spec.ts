import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToolsPage } from './tools-page';

describe('ToolsPage', () => {
  it('places functional and planning calculators alongside the STL and 3MF sections', () => {
    TestBed.configureTestingModule({
      imports: [ToolsPage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ToolsPage);
    fixture.detectChanges();

    const calculatorLink = fixture.nativeElement.querySelector(
      '.tool-card a[href="/tools/3d-print-cost-calculator"]',
    ) as HTMLAnchorElement;
    const toleranceLink = fixture.nativeElement.querySelector(
      'main a[href="/tools/3d-print-tolerance-calculator"]',
    ) as HTMLAnchorElement;

    expect(calculatorLink.textContent?.trim()).toBe('Calculate print cost');
    expect(toleranceLink.textContent?.trim()).toBe('Calculate a fit');
    expect(
      fixture.nativeElement.querySelectorAll(
        '.tool-card a[href="/tools/3d-print-cost-calculator"]',
      ),
    ).toHaveLength(1);
    const headings = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.tools h2'),
    );
    expect(headings.map((heading) => heading.textContent?.trim())).toEqual([
      'Open and inspect',
      'Diagnose a finding',
      'Change and verify',
      'Fit and orient',
      'Material and sliced job',
      'Cost and quote',
    ]);
    const cardRoutes = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll(
        '.tool-card a',
      ),
    ].map((link) => link.getAttribute('href'));
    expect(new Set(cardRoutes).size).toBe(cardRoutes.length);
    expect(
      fixture.nativeElement.querySelector('nav[aria-label="Breadcrumb"]'),
    ).toBeNull();
  });
  it('keeps the entire tool list ahead of every supporting block', () => {
    TestBed.configureTestingModule({
      imports: [ToolsPage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ToolsPage);
    fixture.detectChanges();
    const main = (fixture.nativeElement as HTMLElement).querySelector('main')!;
    const children = Array.from(main.children);
    const directory = main.querySelector('#tool-results')!;
    const groups = Array.from(
      directory.querySelectorAll(':scope > section.tools'),
    );
    const directoryIndex = children.indexOf(directory);

    // Only the brief heading and functional search controls precede the directory.
    expect(
      children
        .slice(0, directoryIndex)
        .map((element) =>
          element.matches('p.eyebrow')
            ? 'eyebrow'
            : element.matches('h1')
              ? 'title'
              : element.matches('p.lead')
                ? 'lead'
                : element.matches('search.tool-search')
                  ? 'search'
                  : 'unexpected block',
        ),
    ).toEqual(['eyebrow', 'title', 'lead', 'search']);
    expect(Array.from(directory.children)).toEqual(groups);
    expect(groups).toHaveLength(fixture.componentInstance.toolGroups.length);
    for (const group of groups) {
      expect(group.querySelectorAll('.tool-card').length).toBeGreaterThan(0);
    }
    const guidance = children.find((element) =>
      element.textContent?.includes('Choose the result you need'),
    )!;
    expect(children.indexOf(guidance)).toBeGreaterThan(directoryIndex);
    expect(
      children.indexOf(main.querySelector('nav[aria-label="Tool tasks"]')!),
    ).toBeGreaterThan(directoryIndex);
    expect(
      children.indexOf(main.querySelector('app-workflow-paths')!),
    ).toBeGreaterThan(directoryIndex);
  });

  function createSearchFixture() {
    TestBed.configureTestingModule({
      imports: [ToolsPage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ToolsPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const search = (query: string) => {
      const input = root.querySelector<HTMLInputElement>('#tool-query')!;
      input.value = query;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const selectType = (type: string) => {
      const select = root.querySelector<HTMLSelectElement>('#tool-type')!;
      select.value = type;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const titles = () =>
      Array.from(root.querySelectorAll('.tool-card h3')).map((heading) =>
        heading.textContent!.trim(),
      );
    return { fixture, root, search, selectType, titles };
  }

  it('renders every tool with searchable type tags before filtering', () => {
    const { root, titles } = createSearchFixture();
    expect(titles()).toHaveLength(47);
    expect(root.querySelector('[role="status"]')?.textContent).toContain(
      '47 of 47 tools',
    );
    for (const card of root.querySelectorAll('.tool-card')) {
      expect(card.querySelectorAll('.tool-tag').length).toBeGreaterThan(0);
    }
    expect(root.querySelectorAll('.empty-results')).toHaveLength(0);
  });

  it('matches multiple words regardless of case or order, including type tags', () => {
    const { search, titles } = createSearchFixture();
    search('  REPAIR  3mF ');
    expect(titles()).toEqual(['3MF Repair Tool']);
    search('comparison');
    expect(titles()).toHaveLength(3);
  });

  it('combines the type filter with text and removes empty task groups and anchors', () => {
    const { root, search, selectType, titles } = createSearchFixture();
    selectType('Viewer');
    expect(titles()).toHaveLength(3);
    search('3mf');
    expect(titles()).toEqual(['Free 3MF Viewer']);
    expect(root.querySelectorAll('.tools')).toHaveLength(1);
    const anchors = root.querySelectorAll('nav[aria-label="Tool tasks"] a');
    expect(anchors).toHaveLength(1);
    expect(anchors[0].getAttribute('href')).toBe('/tools#open-inspect');
    expect(root.querySelector('[role="status"]')?.textContent).toContain(
      '1 of 47 tools',
    );
  });

  it('filters through a card tag and exposes its selected state', () => {
    const { fixture, root, titles } = createSearchFixture();
    root
      .querySelector<HTMLButtonElement>(
        '.tool-tag[aria-label="Filter by Converter"]',
      )!
      .click();
    fixture.detectChanges();
    expect(titles()).toHaveLength(2);
    expect(root.querySelector<HTMLSelectElement>('#tool-type')!.value).toBe(
      'Converter',
    );
    expect(
      Array.from(root.querySelectorAll('.tool-tag')).every(
        (tag) => tag.getAttribute('aria-pressed') === 'true',
      ),
    ).toBe(true);
  });

  it('shows an empty state and restores all tools when filters are cleared', () => {
    const { fixture, root, search, selectType, titles } = createSearchFixture();
    selectType('Repair');
    search('no-such-tool');
    expect(titles()).toEqual([]);
    expect(root.querySelector('.empty-results')?.textContent).toContain(
      'No tools match',
    );
    expect(root.querySelector('[role="status"]')?.textContent).toContain(
      '0 of 47 tools',
    );
    root.querySelector<HTMLButtonElement>('.clear-filters')!.click();
    fixture.detectChanges();
    expect(titles()).toHaveLength(47);
    expect(root.querySelector<HTMLInputElement>('#tool-query')!.value).toBe('');
    expect(root.querySelector<HTMLSelectElement>('#tool-type')!.value).toBe('');
    expect(
      root.querySelector<HTMLButtonElement>('.clear-filters')!.disabled,
    ).toBe(true);
  });
});
