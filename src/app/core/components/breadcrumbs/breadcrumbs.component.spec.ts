import { DOCUMENT } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet, Routes } from '@angular/router';
import { BreadcrumbsComponent } from './breadcrumbs';

@Component({ template: '' })
class BlankPage {}

@Component({
  imports: [BreadcrumbsComponent, RouterOutlet],
  template: '<app-breadcrumbs /><router-outlet />',
})
class BreadcrumbTestShell {}

const routes: Routes = [
  { path: '', component: BlankPage, pathMatch: 'full' },
  { path: 'tools', component: BlankPage },
  { path: 'guides', component: BlankPage },
  { path: 'privacy', component: BlankPage },
  { path: 'tools/stl-repair', component: BlankPage },
  { path: 'tools/3mf-manifold-checker', component: BlankPage },
  { path: 'tools/stl-tools', component: BlankPage },
  { path: 'tools/3mf-tools', component: BlankPage },
  { path: 'tools/3d-print-cost-calculator', component: BlankPage },
  { path: 'guides/how-to-repair-an-stl-file', component: BlankPage },
];

describe('BreadcrumbsComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders visible, crawlable trails and matching JSON-LD', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(BreadcrumbTestShell);
    const router = TestBed.inject(Router);
    const document = TestBed.inject(DOCUMENT);

    fixture.detectChanges();
    await router.navigateByUrl('/tools/stl-repair');
    fixture.detectChanges();

    expect(trail(fixture.nativeElement)).toEqual([
      ['Home', '/'],
      ['All 3D tools', '/tools'],
      ['STL tools', '/tools/stl-tools'],
      ['STL Repair Tool', null],
    ]);
    expect(
      fixture.nativeElement
        .querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')
        ?.textContent?.trim(),
    ).toBe('STL Repair Tool');
    expect(breadcrumbItems(document)).toEqual([
      ['Home', 1, 'https://www.inspectmesh.com/'],
      ['All 3D tools', 2, 'https://www.inspectmesh.com/tools'],
      ['STL tools', 3, 'https://www.inspectmesh.com/tools/stl-tools'],
      ['STL Repair Tool', 4, 'https://www.inspectmesh.com/tools/stl-repair'],
    ]);

    await router.navigateByUrl('/tools/3mf-manifold-checker');
    fixture.detectChanges();
    expect(trail(fixture.nativeElement)).toEqual([
      ['Home', '/'],
      ['All 3D tools', '/tools'],
      ['3MF tools', '/tools/3mf-tools'],
      ['3MF Manifold Checker', null],
    ]);

    await router.navigateByUrl('/tools/stl-tools');
    fixture.detectChanges();
    expect(trail(fixture.nativeElement)).toEqual([
      ['Home', '/'],
      ['All 3D tools', '/tools'],
      ['STL tools', null],
    ]);
    expect(currentPage(fixture.nativeElement)).toBe('STL tools');
    expect(breadcrumbItems(document)).toEqual([
      ['Home', 1, 'https://www.inspectmesh.com/'],
      ['All 3D tools', 2, 'https://www.inspectmesh.com/tools'],
      ['STL tools', 3, 'https://www.inspectmesh.com/tools/stl-tools'],
    ]);

    await router.navigateByUrl('/tools/3mf-tools');
    fixture.detectChanges();
    expect(trail(fixture.nativeElement)).toEqual([
      ['Home', '/'],
      ['All 3D tools', '/tools'],
      ['3MF tools', null],
    ]);
    expect(currentPage(fixture.nativeElement)).toBe('3MF tools');
    expect(breadcrumbItems(document)).toEqual([
      ['Home', 1, 'https://www.inspectmesh.com/'],
      ['All 3D tools', 2, 'https://www.inspectmesh.com/tools'],
      ['3MF tools', 3, 'https://www.inspectmesh.com/tools/3mf-tools'],
    ]);

    await router.navigateByUrl('/tools/3d-print-cost-calculator');
    fixture.detectChanges();
    expect(trail(fixture.nativeElement)).toEqual([
      ['Home', '/'],
      ['All 3D tools', '/tools'],
      ['3D Print Cost Calculator', null],
    ]);
    expect(currentPage(fixture.nativeElement)).toBe('3D Print Cost Calculator');
    expect(breadcrumbItems(document)).toEqual([
      ['Home', 1, 'https://www.inspectmesh.com/'],
      ['All 3D tools', 2, 'https://www.inspectmesh.com/tools'],
      [
        '3D Print Cost Calculator',
        3,
        'https://www.inspectmesh.com/tools/3d-print-cost-calculator',
      ],
    ]);

    await router.navigateByUrl('/guides/how-to-repair-an-stl-file');
    fixture.detectChanges();
    expect(trail(fixture.nativeElement)).toEqual([
      ['Home', '/'],
      ['Guides', '/guides'],
      ['How to Repair an STL File for 3D Printing', null],
    ]);
  });

  it('renders neither breadcrumbs nor BreadcrumbList on excluded pages', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(BreadcrumbTestShell);
    const router = TestBed.inject(Router);
    const document = TestBed.inject(DOCUMENT);

    fixture.detectChanges();
    for (const path of ['/', '/tools', '/guides', '/privacy']) {
      await router.navigateByUrl(path);
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('nav[aria-label="Breadcrumb"]'),
      ).toBeNull();
      expect(
        document.head.querySelector('[data-seo-structured-data]'),
      ).toBeNull();
    }
  });
});

function trail(root: HTMLElement): [string, string | null][] {
  return Array.from(
    root.querySelectorAll(
      'nav[aria-label="Breadcrumb"] a, nav[aria-label="Breadcrumb"] [aria-current="page"]',
    ),
  ).map((item) => [
    item.textContent?.trim() ?? '',
    item instanceof HTMLAnchorElement ? item.getAttribute('href') : null,
  ]);
}

function currentPage(root: HTMLElement): string | undefined {
  return root
    .querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')
    ?.textContent?.trim();
}

function breadcrumbItems(document: Document): [string, number, string][] {
  const data = JSON.parse(
    document.head.querySelector('[data-seo-structured-data]')?.textContent ??
      '',
  );
  return data.itemListElement.map(
    (item: { name: string; position: number; item: string }) => [
      item.name,
      item.position,
      item.item,
    ],
  );
}
