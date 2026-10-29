import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ThreeMfQualityPage } from './threemf-quality-page';
import { JobStatus } from '../../models/job';

describe('3MF quality result availability', () => {
  it('keeps unavailable validation separate from completed zero findings', () => {
    TestBed.configureTestingModule({
      imports: [ThreeMfQualityPage],
      providers: [provideRouter([]), provideHttpClient()],
    });
    const fixture = TestBed.createComponent(ThreeMfQualityPage);
    const base = {
      id: 'job-1',
      fileName: 'control.3mf',
      fileSizeBytes: 100,
      createdAt: '2026-10-29T00:00:00Z',
      status: JobStatus.Completed,
    };
    for (const report of [undefined, {}, { validation: {} }]) {
      fixture.componentInstance.job.set({ ...base, report });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(
        'Mesh analysis unavailable',
      );
      expect(
        fixture.nativeElement.querySelector('#results-title').textContent,
      ).not.toContain('No mesh problems found');
    }
    fixture.componentInstance.job.set({
      ...base,
      report: { validation: { isValid: true, issues: [] } },
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('#results-title').textContent,
    ).toContain('No mesh problems found');
  });
});
