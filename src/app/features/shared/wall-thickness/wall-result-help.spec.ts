import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { strToU8, zipSync } from 'fflate';
import { SeoService } from '../../../core/seo/seo.service';
import { StlWallThicknessPage } from '../../stl-wall-thickness/stl-wall-thickness-page';
import { ThreeMfWallThicknessPage } from '../../three-mf/threemf-wall-thickness-page';
import { readStl } from '../../stl-reducer/stl-reducer';
import {
  WallThicknessReport,
  WallThicknessUnit,
} from './wall-thickness-analysis';
import { resolveThreeMfWallGeometry } from './three-mf-wall-thickness';

const noFlaggedSamples: WallThicknessReport = {
  samples: [{ triangle: 0, thickness: 2 }],
  measured: 1,
  unmeasured: 0,
  belowThreshold: 0,
  minimum: 2,
  average: 2,
  threshold: 1.2,
  unit: WallThicknessUnit.Millimetres,
};

const incompleteThinResult: WallThicknessReport = {
  ...noFlaggedSamples,
  samples: [
    { triangle: 0, thickness: 0.3 },
    { triangle: 1, thickness: null },
  ],
  unmeasured: 1,
  belowThreshold: 1,
  minimum: 0.3,
  average: 0.3,
};

function configure(): void {
  TestBed.configureTestingModule({
    imports: [StlWallThicknessPage, ThreeMfWallThicknessPage],
    providers: [
      provideRouter([]),
      { provide: SeoService, useValue: { apply: vi.fn() } },
    ],
  });
}

it('changes STL next actions with measured, below-threshold and missing coverage states', async () => {
  configure();
  const fixture = TestBed.createComponent(StlWallThicknessPage);
  const page = fixture.componentInstance;
  const element = fixture.nativeElement as HTMLElement;
  const source = new TextEncoder().encode(`solid sheet
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 20 0 0
vertex 20 20 0
endloop
endfacet
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 20 20 0
vertex 0 20 0
endloop
endfacet
endsolid sheet`);
  page.showHeatmap.set(false);
  page.file.set(new File([source], 'public-sheet-control.stl'));
  page.mesh.set(await readStl(page.file()!));
  page.report.set(incompleteThinResult);
  fixture.detectChanges();

  let help = element.querySelector('.next-actions')!;
  expect(help.querySelectorAll('li')).toHaveLength(2);
  expect(help.textContent).toContain('flagged material region');
  expect(help.textContent).toContain('unmeasured directions');
  expect(help.querySelector('a')).toBeNull();

  page.report.set(noFlaggedSamples);
  fixture.detectChanges();
  help = element.querySelector('.next-actions')!;
  expect(help.querySelectorAll('li')).toHaveLength(2);
  expect(help.textContent).toContain('unsampled source regions');
  expect(help.querySelector('a')?.getAttribute('href')).toBe(
    page.guideRouteUrl.Route3dPrintWallThicknessGuide,
  );

  page.report.set({
    ...incompleteThinResult,
    measured: 0,
    unmeasured: 2,
    belowThreshold: 0,
    minimum: null,
    average: null,
    samples: [
      { triangle: 0, thickness: null },
      { triangle: 1, thickness: null },
    ],
  });
  fixture.detectChanges();
  help = element.querySelector('.next-actions')!;
  expect(help.querySelectorAll('li')).toHaveLength(1);
  expect(help.querySelector('a')).toBeNull();

  page.setThreshold(0.5);
  fixture.detectChanges();
  expect(element.querySelector('.next-actions')).toBeNull();
});

it('keeps 3MF next actions tied to placed-geometry coverage and native project settings', async () => {
  configure();
  const archive = zipSync({
    '[Content_Types].xml': strToU8(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    ),
    '_rels/.rels': strToU8(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Id="rel0"/></Relationships>',
    ),
    '3D/3dmodel.model': strToU8(
      '<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" unit="millimeter"><resources><object id="1" type="model"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="20" y="0" z="0"/><vertex x="20" y="20" z="0"/><vertex x="0" y="20" z="0"/></vertices><triangles><triangle v1="0" v2="1" v3="2"/><triangle v1="0" v2="2" v3="3"/></triangles></mesh></object></resources><build><item objectid="1"/></build></model>',
    ),
  });
  const bytes = new Uint8Array(archive).buffer;
  const fixture = TestBed.createComponent(ThreeMfWallThicknessPage);
  const page = fixture.componentInstance;
  const element = fixture.nativeElement as HTMLElement;
  page.showHeatmap.set(false);
  page.file.set(new File([bytes], 'public-placed-control.3mf'));
  page.resolved.set(await resolveThreeMfWallGeometry(bytes));
  page.report.set(incompleteThinResult);
  fixture.detectChanges();

  let help = element.querySelector('.next-actions')!;
  expect(help.querySelectorAll('li')).toHaveLength(2);
  expect(help.textContent).toContain('opposing hit belongs to that object');
  expect(help.textContent).toContain('unsampled placed geometry');

  page.report.set({
    ...noFlaggedSamples,
    measured: 2,
    samples: [
      { triangle: 0, thickness: 2 },
      { triangle: 1, thickness: 2 },
    ],
  });
  fixture.detectChanges();
  help = element.querySelector('.next-actions')!;
  expect(help.querySelectorAll('li')).toHaveLength(1);
  expect(help.textContent).toContain('effective object settings');
  expect(help.querySelector('a')?.getAttribute('href')).toBe(
    page.guideRouteUrl.RouteHowToCheck3mfWallThicknessFor3dPrinting,
  );

  page.setThreshold(0.5);
  fixture.detectChanges();
  expect(element.querySelector('.next-actions')).toBeNull();
});
