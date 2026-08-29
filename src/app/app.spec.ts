import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { App } from './app';

describe('App', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }),
  );

  it('creates the application shell', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('renders ordinary anchors for the STL tool hub and individual tools', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('#tools-menu a'),
    ) as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/tools',
      '/stl-tools',
      '/stl-viewer',
      '/stl-quality-checker',
      '/stl-watertight-checker',
      '/stl-manifold-checker',
      '/stl-triangle-counter',
      '/stl-dimensions-checker',
      '/stl-volume-calculator',
      '/3mf-tools',
      '/3mf-viewer',
      '/3mf-quality-checker',
      '/3mf-dimensions-checker',
      '/3mf-watertight-checker',
      '/3mf-manifold-checker',
      '/3mf-triangle-counter',
      '/3mf-volume-calculator',
    ]);
  });

  it('makes the same STL tools available from the mobile navigation disclosure', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const mobileTrigger = fixture.nativeElement.querySelector(
      '.mobile-nav-toggle',
    ) as HTMLButtonElement;
    mobileTrigger.click();
    fixture.detectChanges();
    expect(mobileTrigger.getAttribute('aria-expanded')).toBe('true');

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('#tools-menu a'),
    ) as HTMLAnchorElement[];
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'All 3D tools',
      'STL tools',
      'STL Viewer',
      'STL Quality Checker',
      'STL Watertight Checker',
      'STL Manifold Checker',
      'STL Triangle Counter',
      'STL Dimensions Checker',
      'STL Volume Calculator',
      '3MF tools',
      '3MF Viewer',
      '3MF Quality Checker',
      '3MF Dimensions Checker',
      '3MF Watertight Checker',
      '3MF Manifold Checker',
      '3MF Triangle Counter',
      '3MF Volume Calculator',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/tools',
      '/stl-tools',
      '/stl-viewer',
      '/stl-quality-checker',
      '/stl-watertight-checker',
      '/stl-manifold-checker',
      '/stl-triangle-counter',
      '/stl-dimensions-checker',
      '/stl-volume-calculator',
      '/3mf-tools',
      '/3mf-viewer',
      '/3mf-quality-checker',
      '/3mf-dimensions-checker',
      '/3mf-watertight-checker',
      '/3mf-manifold-checker',
      '/3mf-triangle-counter',
      '/3mf-volume-calculator',
    ]);
  });
});
