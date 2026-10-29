import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
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

  it('links the Tools label to the directory independently of the dropdown toggle', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector(
      '.tools-link',
    ) as HTMLAnchorElement;
    const toggle = fixture.nativeElement.querySelector(
      '.tools-trigger',
    ) as HTMLButtonElement;
    expect(link.getAttribute('href')).toBe('/tools');
    expect(toggle.getAttribute('aria-label')).toBe('Toggle tools menu');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(TestBed.inject(Router).url).toBe('/');
    link.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/tools');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('links Materials to /materials', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const links = [
      ...fixture.nativeElement.querySelectorAll('nav > a'),
    ] as HTMLAnchorElement[];
    expect(
      links
        .find((link) => link.textContent?.trim() === 'Materials')
        ?.getAttribute('href'),
    ).toBe('/materials');
  });

  it('places the newsletter signup inside the site footer', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const newsletter = fixture.nativeElement.querySelector(
      'app-newsletter-signup',
    ) as HTMLElement;
    const footer = fixture.nativeElement.querySelector(
      'app-site-footer',
    ) as HTMLElement;

    expect(footer.contains(newsletter)).toBe(true);
    expect(newsletter.textContent).toContain('Subscribe');
  });

  it('renders ordinary anchors for the STL tool hub and individual tools', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('#tools-menu a'),
    ) as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/tools/3d-printer-fit-checker',
      '/3d-printers',
      '/tools/compare-3d-printers',
      '/tools/3d-print-cost-calculator',
      '/tools/3d-printing-price-calculator',
      '/tools/filament-length-calculator',
      '/tools/3d-print-flow-rate-calculator',
      '/tools/3d-print-tolerance-calculator',
      '/tools/3d-print-shrinkage-calculator',
      '/tools/3d-print-orientation-planner',
      '/tools/3d-print-bed-layout-planner',
      '/tools/gcode-preflight-checker',
      '/tools',
      '/tools/stl-tools',
      '/tools/stl-viewer',
      '/tools/stl-quality-checker',
      '/tools/stl-print-preflight',
      '/tools/stl-repair',
      '/tools/stl-watertight-checker',
      '/tools/stl-manifold-checker',
      '/tools/stl-dimensions-checker',
      '/tools/stl-scale-tool',
      '/tools/stl-wall-thickness-checker',
      '/tools/stl-overhang-checker',
      '/tools/stl-splitter',
      '/tools/stl-volume-calculator',
      '/tools/stl-triangle-counter',
      '/tools/stl-file-size-reducer',
      '/tools/stl-to-3mf-converter',
      '/tools/3mf-tools',
      '/tools/3mf-viewer',
      '/tools/3mf-quality-checker',
      '/tools/3mf-print-preflight',
      '/tools/3mf-repair',
      '/tools/3mf-watertight-checker',
      '/tools/3mf-manifold-checker',
      '/tools/3mf-dimensions-checker',
      '/tools/3mf-wall-thickness-checker',
      '/tools/3mf-overhang-checker',
      '/tools/3mf-volume-calculator',
      '/tools/3mf-triangle-counter',
      '/tools/3mf-to-stl-converter',
    ]);
  });

  it('groups planning and file-format tools into labelled sections', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector(
      '#tools-menu',
    ) as HTMLElement;
    const planning = menu.querySelector('.tools-menu-planning') as HTMLElement;
    const planningLinks = Array.from(
      planning.querySelectorAll('a'),
    ) as HTMLAnchorElement[];

    expect(
      planningLinks.map((link) => [
        link.textContent?.trim(),
        link.getAttribute('href'),
      ]),
    ).toEqual([
      ['3D Printer Fit Checker', '/tools/3d-printer-fit-checker'],
      ['3D Printers', '/3d-printers'],
      ['Compare 3D Printers', '/tools/compare-3d-printers'],
      ['3D Print Cost Calculator', '/tools/3d-print-cost-calculator'],
      ['3D Printing Price Calculator', '/tools/3d-printing-price-calculator'],
      ['Filament Length Calculator', '/tools/filament-length-calculator'],
      ['Flow Rate Calculator', '/tools/3d-print-flow-rate-calculator'],
      ['Tolerance & Clearance', '/tools/3d-print-tolerance-calculator'],
      ['Shrinkage Calculator', '/tools/3d-print-shrinkage-calculator'],
      ['Orientation Planner', '/tools/3d-print-orientation-planner'],
      ['Bed Layout Planner', '/tools/3d-print-bed-layout-planner'],
    ]);
    expect(
      menu.querySelector('#planning-tools-title')?.textContent?.trim(),
    ).toBe('Planning & calibration');
    expect(
      menu.querySelector('.tools-menu-formats')?.getAttribute('aria-label'),
    ).toBe('Tools by file format');
    expect(
      menu.querySelector('#after-slicing-tools-title')?.textContent?.trim(),
    ).toBe('After slicing');
    expect(
      menu.querySelector('.tools-menu-after-slicing a')?.getAttribute('href'),
    ).toBe('/tools/gcode-preflight-checker');
    expect(
      Array.from(menu.querySelectorAll('.tools-menu-group')).map((group) =>
        group.querySelector('.tools-group-heading')?.textContent?.trim(),
      ),
    ).toEqual(['STL tools', '3MF tools']);
    expect(
      menu.querySelector('.tools-menu-footer a')?.textContent?.trim(),
    ).toBe('View all 3D tools');
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
      '3D Printer Fit Checker',
      '3D Printers',
      'Compare 3D Printers',
      '3D Print Cost Calculator',
      '3D Printing Price Calculator',
      'Filament Length Calculator',
      'Flow Rate Calculator',
      'Tolerance & Clearance',
      'Shrinkage Calculator',
      'Orientation Planner',
      'Bed Layout Planner',
      'G-code Viewer & Preflight',
      'View all 3D tools',
      'STL tools',
      'STL Viewer',
      'STL Quality Checker',
      'STL Print Preflight Checker',
      'STL Repair Tool',
      'STL Watertight Checker',
      'STL Manifold Checker',
      'STL Dimensions Checker',
      'STL Scale Tool',
      'STL Wall Thickness Checker',
      'STL Overhang Checker',
      'STL Splitter',
      'STL Volume Calculator',
      'STL Triangle Counter',
      'STL File Size Reducer',
      'STL to 3MF Converter',
      '3MF tools',
      '3MF Viewer',
      '3MF Quality Checker',
      '3MF Print Preflight Checker',
      '3MF Repair Tool',
      '3MF Watertight Checker',
      '3MF Manifold Checker',
      '3MF Dimensions Checker',
      '3MF Wall Thickness Checker',
      '3MF Overhang Checker',
      '3MF Volume Calculator',
      '3MF Triangle Counter',
      '3MF to STL Converter',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/tools/3d-printer-fit-checker',
      '/3d-printers',
      '/tools/compare-3d-printers',
      '/tools/3d-print-cost-calculator',
      '/tools/3d-printing-price-calculator',
      '/tools/filament-length-calculator',
      '/tools/3d-print-flow-rate-calculator',
      '/tools/3d-print-tolerance-calculator',
      '/tools/3d-print-shrinkage-calculator',
      '/tools/3d-print-orientation-planner',
      '/tools/3d-print-bed-layout-planner',
      '/tools/gcode-preflight-checker',
      '/tools',
      '/tools/stl-tools',
      '/tools/stl-viewer',
      '/tools/stl-quality-checker',
      '/tools/stl-print-preflight',
      '/tools/stl-repair',
      '/tools/stl-watertight-checker',
      '/tools/stl-manifold-checker',
      '/tools/stl-dimensions-checker',
      '/tools/stl-scale-tool',
      '/tools/stl-wall-thickness-checker',
      '/tools/stl-overhang-checker',
      '/tools/stl-splitter',
      '/tools/stl-volume-calculator',
      '/tools/stl-triangle-counter',
      '/tools/stl-file-size-reducer',
      '/tools/stl-to-3mf-converter',
      '/tools/3mf-tools',
      '/tools/3mf-viewer',
      '/tools/3mf-quality-checker',
      '/tools/3mf-print-preflight',
      '/tools/3mf-repair',
      '/tools/3mf-watertight-checker',
      '/tools/3mf-manifold-checker',
      '/tools/3mf-dimensions-checker',
      '/tools/3mf-wall-thickness-checker',
      '/tools/3mf-overhang-checker',
      '/tools/3mf-volume-calculator',
      '/tools/3mf-triangle-counter',
      '/tools/3mf-to-stl-converter',
    ]);
  });

  it('closes the keyboard-accessible tools disclosure with Escape', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector(
      '.tools-trigger',
    ) as HTMLButtonElement;

    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the desktop tools menu one second after leaving it', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const disclosure = fixture.nativeElement.querySelector(
        '.tools-disclosure',
      ) as HTMLElement;
      const menu = fixture.nativeElement.querySelector(
        '#tools-menu',
      ) as HTMLElement;
      const trigger = fixture.nativeElement.querySelector(
        '.tools-trigger',
      ) as HTMLButtonElement;

      disclosure.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      menu.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(999);
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      menu.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      menu.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(1_000);
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    } finally {
      vi.useRealTimers();
    }
  });
});
