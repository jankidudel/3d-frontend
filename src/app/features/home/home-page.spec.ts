import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home-page';

describe('HomePage', () => {
  it('presents links to all public STL tools in the intended order', () => {
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
    expect(fixture.nativeElement.textContent).toContain('STL Quality Check');
    expect(fixture.nativeElement.textContent).toContain(
      'STL Dimensions Checker',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'STL Volume Calculator',
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/stl-quality-check',
      '/stl-manifold-checker',
      '/stl-dimensions-checker',
      '/stl-volume-calculator',
    ]);
  });
});
