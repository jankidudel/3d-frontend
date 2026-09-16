import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
      '/3d-print-cost-calculator',
      '/filament-length-calculator',
      '/3d-print-flow-rate-calculator',
      '/3d-print-tolerance-calculator',
      '/3d-print-shrinkage-calculator',
      '/3d-print-orientation-planner',
      '/3d-print-bed-layout-planner',
      '/gcode-preflight-checker',
      '/tools',
      '/stl-tools',
      '/stl-viewer',
      '/stl-quality-checker',
      '/stl-print-preflight',
      '/stl-repair',
      '/stl-watertight-checker',
      '/stl-manifold-checker',
      '/stl-dimensions-checker',
      '/stl-scale-tool',
      '/stl-wall-thickness-checker',
      '/stl-overhang-checker',
      '/stl-splitter',
      '/stl-volume-calculator',
      '/stl-triangle-counter',
      '/stl-file-size-reducer',
      '/stl-to-3mf-converter',
      '/3mf-tools',
      '/3mf-viewer',
      '/3mf-quality-checker',
      '/3mf-print-preflight',
      '/3mf-repair',
      '/3mf-watertight-checker',
      '/3mf-manifold-checker',
      '/3mf-dimensions-checker',
      '/3mf-wall-thickness-checker',
      '/3mf-overhang-checker',
      '/3mf-volume-calculator',
      '/3mf-triangle-counter',
      '/3mf-to-stl-converter',
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
      ['3D Print Cost Calculator', '/3d-print-cost-calculator'],
      ['Filament Length Calculator', '/filament-length-calculator'],
      ['Flow Rate Calculator', '/3d-print-flow-rate-calculator'],
      ['Tolerance & Clearance', '/3d-print-tolerance-calculator'],
      ['Shrinkage Calculator', '/3d-print-shrinkage-calculator'],
      ['Orientation Planner', '/3d-print-orientation-planner'],
      ['Bed Layout Planner', '/3d-print-bed-layout-planner'],
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
    ).toBe('/gcode-preflight-checker');
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
      '3D Print Cost Calculator',
      'Filament Length Calculator',
      'Flow Rate Calculator',
      'Tolerance & Clearance',
      'Shrinkage Calculator',
      'Orientation Planner',
      'Bed Layout Planner',
      'G-code Preflight Checker',
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
      '/3d-print-cost-calculator',
      '/filament-length-calculator',
      '/3d-print-flow-rate-calculator',
      '/3d-print-tolerance-calculator',
      '/3d-print-shrinkage-calculator',
      '/3d-print-orientation-planner',
      '/3d-print-bed-layout-planner',
      '/gcode-preflight-checker',
      '/tools',
      '/stl-tools',
      '/stl-viewer',
      '/stl-quality-checker',
      '/stl-print-preflight',
      '/stl-repair',
      '/stl-watertight-checker',
      '/stl-manifold-checker',
      '/stl-dimensions-checker',
      '/stl-scale-tool',
      '/stl-wall-thickness-checker',
      '/stl-overhang-checker',
      '/stl-splitter',
      '/stl-volume-calculator',
      '/stl-triangle-counter',
      '/stl-file-size-reducer',
      '/stl-to-3mf-converter',
      '/3mf-tools',
      '/3mf-viewer',
      '/3mf-quality-checker',
      '/3mf-print-preflight',
      '/3mf-repair',
      '/3mf-watertight-checker',
      '/3mf-manifold-checker',
      '/3mf-dimensions-checker',
      '/3mf-wall-thickness-checker',
      '/3mf-overhang-checker',
      '/3mf-volume-calculator',
      '/3mf-triangle-counter',
      '/3mf-to-stl-converter',
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
