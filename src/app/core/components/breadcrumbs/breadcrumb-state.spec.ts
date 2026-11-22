import { TestBed } from '@angular/core/testing';
import { BreadcrumbState } from './breadcrumbs';

describe('BreadcrumbState page trails', () => {
  afterEach(() => TestBed.resetTestingModule());

  const printerTrail = [
    { label: '3D Printers', href: '/3d-printers' },
    { label: 'Bambu Lab A1', href: '/3d-printers/bambu-lab-a1' },
  ];

  it('keeps a page trail when the URL has no derived trail', () => {
    const state = TestBed.inject(BreadcrumbState);
    state.usePageTrail(printerTrail);
    state.routeTrail([]);
    expect(state.breadcrumbs().map((crumb) => crumb.label)).toEqual([
      'Home',
      '3D Printers',
      'Bambu Lab A1',
    ]);
  });

  it('prefers a URL-derived trail and drops a cleared page trail', () => {
    const state = TestBed.inject(BreadcrumbState);
    state.usePageTrail(printerTrail);
    state.routeTrail([
      { label: 'Home', href: '/' },
      { label: 'Tools', href: '/tools' },
    ]);
    expect(state.breadcrumbs().map((crumb) => crumb.label)).toEqual([
      'Home',
      'Tools',
    ]);

    state.usePageTrail(printerTrail);
    state.clearPageTrail();
    state.routeTrail([]);
    expect(state.breadcrumbs()).toEqual([]);
  });
});
