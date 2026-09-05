import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToolsPage } from './tools-page';

describe('ToolsPage', () => {
  it('places one calculator entry before the STL and 3MF sections', () => {
    TestBed.configureTestingModule({
      imports: [ToolsPage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ToolsPage);
    fixture.detectChanges();

    const calculator = fixture.nativeElement.querySelector(
      '#print-cost-calculator',
    ) as HTMLHeadingElement;
    const calculatorLink = calculator.parentElement?.querySelector(
      'a[href="/3d-print-cost-calculator"]',
    ) as HTMLAnchorElement;

    expect(calculator.textContent?.trim()).toBe('3D Print Cost Calculator');
    expect(calculator.parentElement?.textContent).toContain(
      'Estimate material, energy and total print cost from slicer values, or start with an STL or 3MF model.',
    );
    expect(calculatorLink.textContent?.trim()).toBe('Calculate print cost');
    expect(
      fixture.nativeElement.querySelectorAll(
        'main a[href="/3d-print-cost-calculator"]',
      ),
    ).toHaveLength(1);
    const headings = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.tools h2'),
    );
    expect(headings.map((heading) => heading.textContent?.trim())).toEqual([
      '3D Print Cost Calculator',
      'STL tools',
      '3MF tools',
    ]);
    expect(
      fixture.nativeElement.querySelector('nav[aria-label="Breadcrumb"]'),
    ).toBeNull();
  });
});
