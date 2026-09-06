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
      '/3d-print-cost-calculator',
      '/stl-tools',
      '/stl-viewer',
      '/stl-quality-checker',
      '/stl-repair',
      '/stl-watertight-checker',
      '/stl-manifold-checker',
      '/stl-dimensions-checker',
      '/stl-scale-tool',
      '/stl-wall-thickness-checker',
      '/stl-splitter',
      '/stl-volume-calculator',
      '/stl-triangle-counter',
      '/stl-file-size-reducer',
      '/stl-to-3mf-converter',
      '/3mf-tools',
      '/3mf-viewer',
      '/3mf-quality-checker',
      '/3mf-repair',
      '/3mf-watertight-checker',
      '/3mf-manifold-checker',
      '/3mf-dimensions-checker',
      '/3mf-volume-calculator',
      '/3mf-triangle-counter',
      '/3mf-to-stl-converter',
    ]);
  });

  it('places the calculator beside the tools hub in the menu header', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector(
      '#tools-menu',
    ) as HTMLElement;
    const header = menu.querySelector('.tools-menu-header') as HTMLElement;
    const links = Array.from(
      header.querySelectorAll('a'),
    ) as HTMLAnchorElement[];

    expect(
      links.map((link) => [
        link.textContent?.trim(),
        link.getAttribute('href'),
      ]),
    ).toEqual([
      ['All 3D tools', '/tools'],
      ['3D Print Cost Calculator', '/3d-print-cost-calculator'],
    ]);
    expect(Array.from(menu.children).map((child) => child.tagName)).toEqual([
      'DIV',
      'DIV',
      'DIV',
    ]);
    expect(header.getAttribute('class')).toBe('tools-menu-header');
    expect(getComputedStyle(header).display).toBe('contents');
    expect(
      Array.from(menu.querySelectorAll('.tools-menu-group')).map((group) =>
        group.querySelector('.tools-group-heading')?.textContent?.trim(),
      ),
    ).toEqual(['STL tools', '3MF tools']);
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
      '3D Print Cost Calculator',
      'STL tools',
      'STL Viewer',
      'STL Quality Checker',
      'STL Repair Tool',
      'STL Watertight Checker',
      'STL Manifold Checker',
      'STL Dimensions Checker',
      'STL Scale Tool',
      'STL Wall Thickness Checker',
      'STL Splitter',
      'STL Volume Calculator',
      'STL Triangle Counter',
      'STL File Size Reducer',
      'STL to 3MF Converter',
      '3MF tools',
      '3MF Viewer',
      '3MF Quality Checker',
      '3MF Repair Tool',
      '3MF Watertight Checker',
      '3MF Manifold Checker',
      '3MF Dimensions Checker',
      '3MF Volume Calculator',
      '3MF Triangle Counter',
      '3MF to STL Converter',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/tools',
      '/3d-print-cost-calculator',
      '/stl-tools',
      '/stl-viewer',
      '/stl-quality-checker',
      '/stl-repair',
      '/stl-watertight-checker',
      '/stl-manifold-checker',
      '/stl-dimensions-checker',
      '/stl-scale-tool',
      '/stl-wall-thickness-checker',
      '/stl-splitter',
      '/stl-volume-calculator',
      '/stl-triangle-counter',
      '/stl-file-size-reducer',
      '/stl-to-3mf-converter',
      '/3mf-tools',
      '/3mf-viewer',
      '/3mf-quality-checker',
      '/3mf-repair',
      '/3mf-watertight-checker',
      '/3mf-manifold-checker',
      '/3mf-dimensions-checker',
      '/3mf-volume-calculator',
      '/3mf-triangle-counter',
      '/3mf-to-stl-converter',
    ]);
  });
});
