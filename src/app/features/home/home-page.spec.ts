import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home-page';
import { HOME_TOOL_GROUPS } from './home-tools';
describe('HomePage', () => {
  it('keeps a deliberate featured selection while the directory registry stays complete', () => {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const featured = [...element.querySelectorAll('.tools a')].map((link) =>
      link.getAttribute('href'),
    );
    expect(featured).toEqual([
      '/tools/stl-viewer',
      '/tools/3mf-viewer',
      '/tools/stl-print-preflight',
      '/tools/3d-printer-fit-checker',
      '/tools/stl-compare',
      '/tools/batch-stl-checker',
      '/tools/3d-print-cost-calculator',
      '/tools/3d-printing-price-calculator',
    ]);
    expect(featured.length).toBeLessThan(
      HOME_TOOL_GROUPS.flatMap((group) => group.tools).length,
    );
    const heroLinks = [...element.querySelectorAll('.hero-actions a')];
    expect(
      heroLinks.map((link) => [
        link.textContent?.trim(),
        link.getAttribute('href'),
      ]),
    ).toEqual([
      ['Open an STL model', '/tools/stl-viewer'],
      ['Open a 3MF model', '/tools/3mf-viewer'],
      ['Browse all tools', '/tools'],
    ]);
    expect(heroLinks.every((link) => link.classList.contains('button'))).toBe(
      true,
    );
    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.textContent).toContain(
      'Some quality, topology and volume checks upload',
    );
  });
});
