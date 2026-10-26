import { DOCUMENT } from '@angular/common';
import { ExampleAsset } from '../examples/example-assets';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
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
  readonly exampleAsset = ExampleAsset;
  readonly guideRouteUrl = GuideRouteUrl;
  readonly routeUrl = PublicRouteUrl;
  readonly file = signal<File | null>(null);
  readonly analysis = signal<ThreeMfRepairAnalysis | null>(null);
  readonly result = signal<ThreeMfRepairResult | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly summaryFeedback = signal('');
  readonly copyingSummary = signal(false);
  readonly planMessage = computed(() => {
    if (!this.analysis()) {
      return 'The repair plan is not ready yet.';
    }
    if (this.result()) {
      return 'Repair copy created. Verify the saved package.';
    }
    return this.canRepair()
      ? 'Review the selected removals before creating a copy.'
      : 'No supported removal is selected. Other mesh problems may remain.';
  });
  private readonly document = inject(DOCUMENT);
  private requestId = 0;
  readonly plan = signal<ThreeMfRepairPlan>({
    removeDegenerateTriangles: false,
    removeDuplicateTriangles: false,
    removeInvalidIndexTriangles: false,
  });
  readonly canRepair = computed(() => {
    const counts = this.analysis()?.counts;
    const plan = this.plan();
    return (
      !!counts &&
      ((plan.removeDuplicateTriangles && counts.duplicateTriangles > 0) ||
        (plan.removeDegenerateTriangles && counts.degenerateTriangles > 0) ||
        (plan.removeInvalidIndexTriangles && counts.invalidIndexTriangles > 0))
    );
  });
  private readonly analytics = inject(AnalyticsService);
  constructor() {
    inject(SeoService).apply({
      title: '3MF Repair: Local Triangle Cleanup | InspectMesh',
      description:
        'Review supported triangle removals in a 3MF package locally, save a separate copy and verify its build. No hole filling or winding correction.',
      path: PublicRouteUrl.ThreeMfRepair,
    });
  }
  async onFileSelected(file: File | null): Promise<void> {
    const requestId = ++this.requestId;
    this.loading.set(false);
    this.summaryFeedback.set('');
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
      if (requestId !== this.requestId) {
        return;
      }
      this.file.set(file);
      this.analysis.set(analysis);
      this.plan.set(defaultRepairPlan(analysis.counts));
      this.analytics.trackThreeMfRepair(
        AnalyticsEvent.ThreeMfRepairAnalysisCompleted,
      );
    } catch {
      if (requestId !== this.requestId) {
        return;
      }
      this.error.set(
        'This package cannot be repaired by this local method. Review it in the producing application. No repaired copy was created. Choose a standard, readable 3MF with a relationship-selected mesh model; unsupported or ambiguous packages are left unchanged.',
      );
    } finally {
      if (requestId === this.requestId) {
        this.loading.set(false);
      }
    }
  }
  setPlan(key: keyof ThreeMfRepairPlan, selected: boolean): void {
    if (this.loading()) {
      return;
    }
    this.result.set(null);
    this.summaryFeedback.set('');
    this.error.set('');
    this.plan.update((plan) => ({ ...plan, [key]: selected }));
  }
  async repair(): Promise<void> {
    const analysis = this.analysis();
    if (!analysis || !this.canRepair() || this.loading()) {
      return;
    }
    const requestId = ++this.requestId;
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);
    this.summaryFeedback.set('');
    try {
      const result = await repairThreeMfLocally(analysis, this.plan());
      if (requestId !== this.requestId) {
        return;
      }
      this.result.set(result);
      this.analytics.trackThreeMfRepair(AnalyticsEvent.ThreeMfRepairApplied);
    } catch {
      if (requestId !== this.requestId) {
        return;
      }
      this.error.set(
        'No repaired copy was created. Keep the original and review the error. No selected repair could be applied safely.',
      );
    } finally {
      if (requestId === this.requestId) {
        this.loading.set(false);
      }
    }
  }
  async copySummary(): Promise<void> {
    const result = this.result();
    if (!result || this.copyingSummary()) {
      return;
    }
    this.copyingSummary.set(true);
    this.summaryFeedback.set('');
    const counts = result.after.counts;
    const summary = [
      'Method: browser-local selected 3MF triangle removal.',
      `Applied removals: duplicate ${result.applied.duplicateTriangles}; degenerate ${result.applied.degenerateTriangles}; invalid-index ${result.applied.invalidIndexTriangles}.`,
      `Source triangle records: ${result.before.counts.triangles} before; ${counts.triangles} after.`,
      `Remaining removal-plan findings: duplicate ${counts.duplicateTriangles}; degenerate ${counts.degenerateTriangles}; invalid-index ${counts.invalidIndexTriangles}; open edges ${counts.openEdges}; over-shared edges ${counts.nonManifoldEdges}; winding conflicts ${counts.inconsistentWindingEdges}.`,
      'Removal-plan edge counts use source vertex indexes, skip duplicate/degenerate/invalid-index faces and are not the server topology method or an intersection check. Recheck saved geometry separately.',
      `Recheck declared unit (${result.after.packageInfo.declaredUnit}), required resource references, transforms, ${result.after.resolved.buildItemCount} placed build items and build bounds.`,
      'Open the saved copy in local preflight and the receiving slicer; review assignments and settings. No physical print was verified.',
    ].join('\n');
    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (!clipboard) {
        throw new Error('Clipboard unavailable');
      }
      await clipboard.writeText(summary);
      if (this.result() === result) {
        this.summaryFeedback.set(
          'Repair summary copied. Filenames and model contents are excluded.',
        );
      }
    } catch {
      if (this.result() === result) {
        this.summaryFeedback.set(
          'Could not copy the repair summary. Check browser clipboard permissions and try again.',
        );
      }
    } finally {
      this.copyingSummary.set(false);
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
