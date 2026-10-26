import { TestBed } from '@angular/core/testing';
import { WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Job, JobStatus } from '../../models/job';
import { ThreeMfWatertightPage } from './threemf-watertight-page';
import { ThreeMfManifoldPage } from './threemf-manifold-page';
import { StlWatertightPage } from '../stl-watertight/stl-watertight-page';

for (const component of [
  ThreeMfWatertightPage,
  ThreeMfManifoldPage,
  StlWatertightPage,
]) {
  describe(`${component.name} result availability`, () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [component],
        providers: [provideRouter([]), provideHttpClient()],
      });
    });

    it('keeps missing and malformed counts distinct from a completed zero', () => {
      const fixture = TestBed.createComponent<{
        readonly job: WritableSignal<Job | null>;
      }>(component);
      for (const openEdgeCount of [undefined, null, -1, 0.5, NaN]) {
        fixture.componentInstance.job.set(
          job({
            openEdgeCount,
            nonManifoldEdgeCount: 0,
            connectedComponentCount: 1,
          }),
        );
        fixture.detectChanges();
        expect(
          fixture.nativeElement.querySelector('#results-title').textContent,
        ).toContain('unavailable');
      }
      fixture.componentInstance.job.set(
        job({
          openEdgeCount: 0,
          nonManifoldEdgeCount: 0,
          connectedComponentCount: 1,
        }),
      );
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('#results-title').textContent,
      ).toContain('No ');
      expect(
        fixture.nativeElement.querySelector('#results-title').textContent,
      ).not.toContain('unavailable');
      fixture.componentInstance.job.set(
        job({
          openEdgeCount: 0,
          nonManifoldEdgeCount: 3,
          connectedComponentCount: 1,
        }),
      );
      fixture.detectChanges();
      const heading =
        fixture.nativeElement.querySelector('#results-title').textContent;
      if (component === ThreeMfManifoldPage) {
        expect(heading).toContain('Topology issues found');
      } else {
        expect(heading).toContain('No exposed boundaries');
      }
    });

    it('shows an exposed boundary separately from a failed check', () => {
      const fixture = TestBed.createComponent<{
        readonly job: WritableSignal<Job | null>;
      }>(component);
      fixture.componentInstance.job.set(
        job({
          openEdgeCount: 4,
          nonManifoldEdgeCount: 0,
          connectedComponentCount: 1,
        }),
      );
      fixture.detectChanges();
      const heading =
        fixture.nativeElement.querySelector('#results-title').textContent;
      expect(heading).toMatch(/found/);
      fixture.componentInstance.job.set({
        ...job({}),
        status: JobStatus.Failed,
      });
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('[role="alert"]'),
      ).not.toBeNull();
      expect(
        fixture.nativeElement.querySelector('#results-title').textContent,
      ).not.toBe(heading);
    });
  });
}

function job(topology: Record<string, unknown>): Job {
  return {
    id: 'bounded-check',
    fileName: 'control.3mf',
    fileSizeBytes: 1024,
    status: JobStatus.Completed,
    createdAt: '2026-10-25T00:00:00Z',
    report: { topology } as Job['report'],
  };
}
