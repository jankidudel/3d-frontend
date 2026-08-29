import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home-page';

describe('HomePage', () => {
  it('presents links to all public tools in the intended order', () => {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a'),
    ) as HTMLAnchorElement[];

    expect(fixture.nativeElement.textContent).toContain('Choose a tool');
    expect(fixture.nativeElement.textContent).toContain(
      'Currently supporting STL and 3MF files.',
    );
    expect(fixture.nativeElement.textContent).toContain('STL tools');
    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe(
      '3D Quality Tools',
    );
    expect(fixture.nativeElement.querySelector('h2')?.textContent?.trim()).toBe(
      'Choose a tool',
    );
    expect(fixture.nativeElement.querySelector('h3')?.textContent?.trim()).toBe(
      'STL tools',
    );
    expect(fixture.nativeElement.textContent).toContain('STL Quality Checker');
    expect(fixture.nativeElement.textContent).toContain(
      'STL Dimensions Checker',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'STL Volume Calculator',
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/stl-viewer',
      '/stl-quality-checker',
      '/stl-watertight-checker',
      '/stl-manifold-checker',
      '/stl-triangle-counter',
      '/stl-dimensions-checker',
      '/stl-volume-calculator',
      '/3mf-viewer',
      '/3mf-quality-checker',
      '/3mf-watertight-checker',
      '/3mf-manifold-checker',
      '/3mf-triangle-counter',
      '/3mf-dimensions-checker',
      '/3mf-volume-calculator',
      '/stl-tools',
      '/tools',
    ]);
  });
});
