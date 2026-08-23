import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
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

  it('opens and closes the tools disclosure with click, outside click, and Escape', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector(
      '.tools-trigger',
    ) as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(
      fixture.nativeElement.querySelectorAll('#tools-menu a'),
    ).toHaveLength(4);

    document.body.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes the tools disclosure after route navigation', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector(
      '.tools-trigger',
    ) as HTMLButtonElement;

    trigger.click();
    await router.navigateByUrl('/stl-quality-check');
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
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

    const toolsTrigger = fixture.nativeElement.querySelector(
      '.tools-trigger',
    ) as HTMLButtonElement;
    toolsTrigger.click();
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('#tools-menu a'),
    ) as HTMLAnchorElement[];
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'STL Quality Check',
      'STL Manifold Checker',
      'STL Dimensions Checker',
      'STL Volume Calculator',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/stl-quality-check',
      '/stl-manifold-checker',
      '/stl-dimensions-checker',
      '/stl-volume-calculator',
    ]);
  });
});
