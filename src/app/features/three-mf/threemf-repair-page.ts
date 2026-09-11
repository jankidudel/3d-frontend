import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { ThreeMfFilePicker } from './threemf-file-picker';
import { FeedbackLinkComponent } from '../../core/components/feedback-link/feedback-link';
import {
  analyseThreeMfForRepair,
  defaultRepairPlan,
  repairThreeMfLocally,
  type ThreeMfRepairAnalysis,
  type ThreeMfRepairPlan,
  type ThreeMfRepairResult,
} from './three-mf-local-repair';

@Component({
  selector: 'app-three-mf-repair-page',
  imports: [RouterLink, ThreeMfFilePicker, FeedbackLinkComponent],
  templateUrl: './threemf-repair-page.html',
  styleUrl: './threemf-repair-page.scss',
})
export class ThreeMfRepairPage {
  readonly routeUrl = PublicRouteUrl;
  readonly file = signal<File | null>(null);
  readonly analysis = signal<ThreeMfRepairAnalysis | null>(null);
  readonly result = signal<ThreeMfRepairResult | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly plan = signal<ThreeMfRepairPlan>({
    removeDegenerateTriangles: false,
    removeDuplicateTriangles: false,
    removeInvalidIndexTriangles: false,
  });
  readonly canRepair = computed(() => Object.values(this.plan()).some(Boolean));
  private readonly analytics = inject(AnalyticsService);
  constructor() {
    inject(SeoService).apply({
      title: '3MF Repair Tool - Conservative Local Mesh Cleanup | InspectMesh',
      description:
        'Inspect a 3MF package locally, remove supported duplicate or degenerate triangles, and download a repaired 3MF copy to verify.',
      path: PublicRouteUrl.ThreeMfRepair,
    });
  }
  async onFileSelected(file: File | null): Promise<void> {
    this.file.set(null);
    this.analysis.set(null);
    this.result.set(null);
    this.error.set('');
    if (!file) {
      return;
    }
    this.loading.set(true);
    this.analytics.trackThreeMfRepair(
      AnalyticsEvent.ThreeMfRepairUploadStarted,
      file.size,
    );
    try {
      const analysis = await analyseThreeMfForRepair(await file.arrayBuffer());
      this.file.set(file);
      this.analysis.set(analysis);
      this.plan.set(defaultRepairPlan(analysis.counts));
      this.analytics.trackThreeMfRepair(
        AnalyticsEvent.ThreeMfRepairAnalysisCompleted,
      );
    } catch {
      this.error.set(
        'This 3MF package cannot be safely rewritten here. Choose a standard, readable 3MF with a relationship-selected mesh model; unsupported or ambiguous packages are left unchanged.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  setPlan(key: keyof ThreeMfRepairPlan, selected: boolean): void {
    this.plan.update((plan) => ({ ...plan, [key]: selected }));
  }
  async repair(): Promise<void> {
    const analysis = this.analysis();
    if (!analysis || !this.canRepair() || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      this.result.set(await repairThreeMfLocally(analysis, this.plan()));
      this.analytics.trackThreeMfRepair(AnalyticsEvent.ThreeMfRepairApplied);
    } catch {
      this.error.set(
        'No selected repair could be applied safely. The original file has not been changed.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  download(): void {
    const result = this.result(),
      file = this.file();
    if (!result || !file) {
      return;
    }
    const url = URL.createObjectURL(
      new Blob([result.bytes.slice().buffer as ArrayBuffer], {
        type: 'model/3mf',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file.name.replace(/\.3mf$/i, '') || 'model'}-repaired.3mf`;
    link.click();
    this.analytics.trackThreeMfRepair(AnalyticsEvent.ThreeMfRepairDownloaded);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  verifyClicked(): void {
    this.analytics.trackThreeMfRepair(
      AnalyticsEvent.ThreeMfRepairVerifyPreflightClicked,
    );
  }
  count(value: number): string {
    return new Intl.NumberFormat().format(value);
  }
}
