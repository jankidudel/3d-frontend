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
      'main a[href="/3d-print-cost-calculator"]',
    ) as HTMLAnchorElement;
    const toleranceLink = fixture.nativeElement.querySelector(
      'main a[href="/3d-print-tolerance-calculator"]',
    ) as HTMLAnchorElement;

    expect(calculatorLink.textContent?.trim()).toBe('Calculate print cost');
    expect(toleranceLink.textContent?.trim()).toBe('Calculate a fit');
    expect(
      fixture.nativeElement.querySelectorAll(
        'main a[href="/3d-print-cost-calculator"]',
      ),
    ).toHaveLength(1);
    const headings = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.tools h2'),
    );
    expect(headings.map((heading) => heading.textContent?.trim())).toEqual([
      'STL tools',
      '3MF tools',
      'Planning and functional tools',
      'G-code and print workflow',
    ]);
    expect(
      fixture.nativeElement.querySelector('nav[aria-label="Breadcrumb"]'),
    ).toBeNull();
  });
});
