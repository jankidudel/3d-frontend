import { reportThumbnail } from './report-thumbnail';
import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { printers } from '../printer-comparison/printer-catalogue';
import {
  MeshExample,
  exampleFile,
  releaseExampleFiles,
} from './example-meshes';
import {
  CheckSettings,
  QueueState,
  ModelUnits,
  WorkflowLimits,
  collectionAllowance,
} from './mesh-workflows';
import { loadWorkflowModel } from './load-model';
import { MeshWorkerMode, runMeshWorker } from './mesh-worker';

export const ReportFormat = { Json: 'json', Csv: 'csv' } as const;
export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];
import {
  QueueEntry,
  collectionStatus,
  createCollectionReport,
  collectionCsv,
  collectionJson,
  needsReview,
  nextAction,
} from './collection-report';
import { ReviewDestination, ReviewSession } from './review-session';
const HISTORY_KEY = 'inspectmesh-local-batch-reports-v1';
const BatchFilter = {
  All: 'all',
  Attention: 'attention',
  Failed: 'failed',
  Completed: 'completed',
} as const;
type BatchFilter = (typeof BatchFilter)[keyof typeof BatchFilter];
@Component({
  selector: 'app-batch-page',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './batch-page.html',
  styleUrl: '../planning/planning-page.scss',
})
export class BatchPage {
  readonly routeUrl = PublicRouteUrl;
  readonly reportFormats = ReportFormat;
  readonly limits = WorkflowLimits;
  readonly states = QueueState;
  readonly units = ModelUnits;
  readonly filters = BatchFilter;
  readonly reference = signal('');
  readonly reportDate = signal('');
  readonly destinations = ReviewDestination;
  readonly nextAction = nextAction;
  readonly reportModel = computed(() =>
    createCollectionReport(
      this.rows(),
      this.settingsSignal(),
      this.reportDate(),
      this.reference(),
    ),
  );
  private readonly settingsSignal = signal<CheckSettings | null>(null);
  private files: readonly File[] = [];
  private readonly session = inject(ReviewSession);
  private readonly router = inject(Router);
  private exampleRun = false;
  readonly rows = signal<readonly QueueEntry[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly unit = signal<ModelUnits>(ModelUnits.Millimetres);
  readonly printerId = signal('');
  readonly reportPreview = signal(false);
  readonly printerChoices = printers.filter(
    (printer) => printer.published !== false,
  );
  readonly threshold = signal(1.2);
  readonly preview = signal(false);
  readonly developmentPreview = environment.devWorkflowPreview;
  readonly allowance = computed(() =>
    collectionAllowance(this.developmentPreview, this.preview()),
  );
  readonly filter = signal<BatchFilter>(BatchFilter.All);
  readonly sortAttention = signal(true);
  readonly status = computed(() => collectionStatus(this.rows()));
  readonly completed = computed(
    () => this.rows().filter((row) => row.state === QueueState.Complete).length,
  );
  readonly visible = computed(() => {
    const rows = this.rows().filter(
      (row) =>
        this.filter() === BatchFilter.All ||
        (this.filter() === BatchFilter.Failed
          ? row.state === QueueState.Failed
          : this.filter() === BatchFilter.Completed
            ? row.state === QueueState.Complete
            : this.needsAttention(row)),
    );
    return this.sortAttention()
      ? [...rows].sort(
          (a, b) =>
            Number(this.needsAttention(b)) - Number(this.needsAttention(a)),
        )
      : rows;
  });
  readonly savedMessage = signal('');
  readonly preparedDownload = signal<{ url: string; name: string } | null>(
    null,
  );
  readonly history = signal<
    readonly { date: string; files: number; report: string; status?: string }[]
  >([]);
  private readonly analytics = inject(AnalyticsService);
  private controller: AbortController | null = null;
  private settings: CheckSettings | null = null;
  constructor() {
    inject(SeoService).apply({
      title:
        'Batch STL and 3MF Checker - Local Collection Reports | InspectMesh',
      description:
        'Check a collection of STL and supported 3MF files locally. Review units, mesh findings, printer fit and sampled walls, then export a consistent report.',
      path: PublicRouteUrl.BatchStlChecker,
    });
    const retained = this.session.collection;
    if (retained) {
      this.files = retained.files;
      this.rows.set(retained.rows);
      this.settings = retained.settings;
      this.settingsSignal.set(retained.settings);
      this.reportDate.set(retained.date);
      this.reference.set(retained.reference);
      this.unit.set(retained.settings.stlUnit);
      this.threshold.set(retained.settings.thicknessThresholdMm);
      this.printerId.set(
        this.printerChoices.find(
          (printer) => printer.displayName === retained.settings.printer?.name,
        )?.id ?? '',
      );
    }
    inject(DestroyRef).onDestroy(() => {
      this.controller?.abort();
      const prepared = this.preparedDownload();
      if (prepared) {
        URL.revokeObjectURL(prepared.url);
      }
      this.rows.update((rows) =>
        rows.map((row) =>
          row.state === QueueState.Waiting ||
          row.state === QueueState.Reading ||
          row.state === QueueState.Checking
            ? { ...row, state: QueueState.Cancelled }
            : row,
        ),
      );
      this.retain();
    });
    if (typeof localStorage !== 'undefined') {
      try {
        const parsed: unknown = JSON.parse(
          localStorage.getItem(HISTORY_KEY) ?? '[]',
        );
        if (Array.isArray(parsed)) {
          this.history.set(
            parsed
              .filter(
                (
                  entry,
                ): entry is { date: string; files: number; report: string } =>
                  typeof entry?.date === 'string' &&
                  typeof entry?.files === 'number' &&
                  typeof entry?.report === 'string',
              )
              .slice(0, 10),
          );
        }
      } catch {
        this.savedMessage.set('Saved browser reports are unavailable.');
      }
    }
  }
  async pick(event: Event): Promise<void> {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    await this.process(files);
    (event.target as HTMLInputElement).value = '';
  }
  async drop(event: DragEvent): Promise<void> {
    event.preventDefault();
    await this.process(Array.from(event.dataTransfer?.files ?? []));
  }
  dragOver(event: DragEvent): void {
    event.preventDefault();
  }
  clearSession(): void {
    if (this.busy()) {
      return;
    }
    const prepared = this.preparedDownload();
    if (prepared) {
      URL.revokeObjectURL(prepared.url);
      this.preparedDownload.set(null);
    }
    this.savedMessage.set('');
    this.files = [];
    this.rows.set([]);
    this.settings = null;
    this.settingsSignal.set(null);
    this.reference.set('');
    this.session.clear();
  }
  private retain(): void {
    if (this.settings) {
      this.session.collection = {
        rows: this.rows(),
        files: this.files,
        settings: this.settings,
        date: this.reportDate(),
        reference: this.reference(),
      };
    }
  }
  async handoff(id: number, destination: ReviewDestination): Promise<void> {
    const file = this.files[id];
    if (!file || this.busy()) {
      return;
    }
    this.retain();
    this.session.offer(
      file,
      this.settings?.stlUnit ?? this.unit(),
      destination,
    );
    this.analytics.trackWorkflow(
      AnalyticsEvent.FileHandoff,
      'batch',
      destination,
    );
    await this.router.navigateByUrl(
      destination === ReviewDestination.Compare
        ? PublicRouteUrl.StlCompare
        : destination === ReviewDestination.Viewer
          ? PublicRouteUrl.Viewer
          : /\.3mf$/i.test(file.name)
            ? PublicRouteUrl.ThreeMfPrintPreflight
            : PublicRouteUrl.StlPrintPreflight,
    );
  }
  async replaceFile(id: number, event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || this.busy()) {
      return;
    }
    this.files = this.files.map((original, index) =>
      index === id ? file : original,
    );
    this.update(id, { name: file.name });
    await this.rerun(id);
    (event.target as HTMLInputElement).value = '';
  }
  async rerun(id: number): Promise<void> {
    const file = this.files[id];
    if (!file || !this.settings || this.busy()) {
      return;
    }
    await this.process([file], id);
  }
  async budgetExample(): Promise<void> {
    if (!this.developmentPreview || this.busy()) {
      return;
    }
    const { exampleMesh, MeshExample } = await import('./example-meshes');
    const { writeBinaryStl } = await import('../stl-reducer/stl-reducer');
    const cube = exampleMesh(MeshExample.Cube);
    const copies = Math.floor(WorkflowLimits.Triangles / 12);
    const positions = new Float32Array(cube.positions.length * copies);
    const indices = new Uint32Array(cube.indices.length * copies);
    for (let i = 0; i < copies; i++) {
      positions.set(
        cube.positions.map(
          (value, axis) => value + (axis % 3 === 0 ? i * 21 : 0),
        ),
        i * cube.positions.length,
      );
      indices.set(
        cube.indices.map((index) => index + (i * cube.positions.length) / 3),
        i * cube.indices.length,
      );
    }
    await this.process([
      new File(
        [writeBinaryStl({ positions, indices, encoding: cube.encoding })],
        'owned-budget-99996.stl',
      ),
    ]);
  }
  async packageExample(): Promise<void> {
    try {
      const { ownedDemoFile, DemoAsset } = await import('./demo-file');
      this.analytics.trackWorkflow(AnalyticsEvent.ExampleLoaded, 'batch_3mf');
      this.exampleRun = true;
      await this.process([await ownedDemoFile(DemoAsset.Package)]);
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The example could not be loaded.',
      );
    }
  }
  async releaseExample(): Promise<void> {
    this.exampleRun = true;
    await this.process(releaseExampleFiles());
  }
  async example(): Promise<void> {
    this.analytics.trackWorkflow(AnalyticsEvent.ExampleLoaded, 'batch');
    this.exampleRun = true;
    await this.process([
      exampleFile(MeshExample.Cube),
      exampleFile(MeshExample.Open),
      new File(['malformed'], 'malformed.stl'),
    ]);
  }
  async process(files: readonly File[], rerunId?: number): Promise<void> {
    if (this.busy() || !files.length) {
      return;
    }
    this.error.set('');
    if (files.length > this.allowance()) {
      this.analytics.trackWorkflow(
        AnalyticsEvent.AllowanceEncountered,
        'batch',
        'file_count',
      );
      this.error.set(
        `Choose up to ${this.allowance()} files. The free allowance is ${WorkflowLimits.FreeQueue}. Larger collections are not yet available.`,
      );
      return;
    }
    if (!(Number.isFinite(this.threshold()) && this.threshold() > 0)) {
      this.error.set(
        'Enter a positive finite wall review threshold in millimetres.',
      );
      return;
    }
    const printer = this.printerChoices.find(
      (item) => item.id === this.printerId(),
    );
    if (rerunId === undefined) {
      this.settings = {
        stlUnit: this.unit(),
        thicknessThresholdMm: this.threshold(),
        printer: printer
          ? { name: printer.displayName, dimensions: printer.buildVolumeMm }
          : null,
      };
      this.settingsSignal.set(this.settings);
    }
    const settings = this.settings;
    if (!settings) {
      return;
    }
    const orderedFiles =
      rerunId === undefined
        ? [...files].sort((a, b) => {
            const x = a.webkitRelativePath || a.name;
            const y = b.webkitRelativePath || b.name;
            return x < y ? -1 : x > y ? 1 : 0;
          })
        : files;
    this.reportDate.set(new Date().toISOString());
    this.controller = new AbortController();
    const controller = this.controller;
    this.busy.set(true);
    if (rerunId === undefined) {
      this.files = orderedFiles;
      this.rows.set(
        orderedFiles.map((file, id) => ({
          id,
          name: file.webkitRelativePath || file.name,
          state: QueueState.Waiting,
          error: '',
          result: null,
          unit: '',
          warnings: [],
          durationMs: 0,
        })),
      );
    }
    const source = this.exampleRun
      ? 'example_collection'
      : rerunId === undefined
        ? 'user_collection'
        : 'file_rerun';
    this.exampleRun = false;
    this.analytics.trackWorkflow(
      AnalyticsEvent.BatchOpened,
      source,
      files.length <= 3 ? '1_to_3' : '4_to_20',
    );
    try {
      for (let index = 0; index < orderedFiles.length; index++) {
        const id = rerunId ?? index;
        if (controller.signal.aborted) {
          break;
        }
        const started = performance.now();
        this.update(id, {
          state: QueueState.Reading,
          error: '',
          result: null,
          warnings: [],
          thumbnail: null,
          unit: '',
        });
        try {
          const loaded = await loadWorkflowModel(
            orderedFiles[index],
            settings.stlUnit,
          );
          if (controller.signal.aborted) {
            break;
          }
          this.update(id, {
            state: QueueState.Checking,
            unit: loaded.unit,
            warnings: loaded.warnings,
            thumbnail: reportThumbnail(loaded.mesh),
          });
          const processed = await runMeshWorker(
            {
              mode: MeshWorkerMode.Check,
              mesh: loaded.mesh,
              settings,
              scale: loaded.scale,
            },
            controller.signal,
          );
          if (!processed.check) {
            throw new Error(
              'No supported geometry result was returned. Re-export and rerun this file.',
            );
          }
          this.update(id, {
            state: QueueState.Complete,
            result: processed.check ?? null,
            durationMs: performance.now() - started,
          });
        } catch (error: unknown) {
          if (controller.signal.aborted) {
            break;
          }
          this.update(id, {
            state: QueueState.Failed,
            error:
              error instanceof Error
                ? error.message
                : 'File could not be checked.',
            durationMs: performance.now() - started,
          });
        }
      }
      if (controller.signal.aborted) {
        this.rows.update((rows) =>
          rows.map((row) =>
            row.state === QueueState.Waiting ||
            row.state === QueueState.Reading ||
            row.state === QueueState.Checking
              ? { ...row, state: QueueState.Cancelled }
              : row,
          ),
        );
      } else {
        this.analytics.trackWorkflow(
          AnalyticsEvent.BatchCompleted,
          source,
          this.completed() <= 3 ? '1_to_3' : '4_to_20',
        );
      }
    } finally {
      this.busy.set(false);
      this.retain();
      this.analytics.trackWorkflow(
        AnalyticsEvent.BatchFailureCount,
        source,
        String(
          this.rows().filter((row) => row.state === QueueState.Failed).length,
        ),
      );
    }
  }
  cancel(): void {
    this.controller?.abort();
  }
  private update(id: number, update: Partial<QueueEntry>): void {
    this.rows.update((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...update } : row)),
    );
  }
  needsAttention(row: QueueEntry): boolean {
    return needsReview(row);
  }
  report(): string {
    return collectionJson(this.reportModel());
  }
  export(format: ReportFormat): void {
    try {
      const contents =
        format === ReportFormat.Json
          ? this.report()
          : `\uFEFF${collectionCsv(this.reportModel())}`;
      this.download(contents, format);
      this.savedMessage.set(
        `Download requested: ${format.toUpperCase()} report with all ${this.rows().length} inputs. Check your browser downloads.`,
      );
    } catch {
      this.savedMessage.set(
        'Report download could not start. Try again or use the printable report.',
      );
      return;
    }
    this.analytics.trackWorkflow(
      AnalyticsEvent.ReportExported,
      'batch',
      format,
    );
  }
  private download(contents: string, extension: string): void {
    const url = URL.createObjectURL(
      new Blob([contents], {
        type:
          extension === ReportFormat.Json
            ? 'application/json'
            : 'text/csv;charset=utf-8',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `inspectmesh-batch-${this.reportDate().slice(0, 10) || 'saved'}.${extension}`;
    const previous = this.preparedDownload();
    if (previous) {
      URL.revokeObjectURL(previous.url);
    }
    this.preparedDownload.set({ url, name: anchor.download });
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }
  print(): void {
    window.print();
    this.analytics.trackWorkflow(
      AnalyticsEvent.ReportExported,
      'batch',
      'print',
    );
  }
  save(): void {
    try {
      const reports = [
        {
          date: new Date().toISOString(),
          files: this.rows().length,
          status: this.status(),
          report: this.report(),
        },
        ...this.history(),
      ].slice(0, 10);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(reports));
      this.history.set(reports);
      this.savedMessage.set(
        'Report saved in this browser only. It contains filenames and findings; original model bytes are not stored.',
      );
    } catch {
      this.savedMessage.set(
        'Browser storage is unavailable or full. Export the report instead.',
      );
    }
  }
  downloadHistory(report: string): void {
    this.download(report, ReportFormat.Json);
  }
  clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY);
      this.history.set([]);
      this.savedMessage.set('Local report history cleared.');
    } catch {
      this.savedMessage.set('Browser storage could not be cleared.');
    }
  }
  viewOffer(event: Event): void {
    if (!(event.target as HTMLDetailsElement).open) {
      return;
    }
    this.analytics.trackWorkflow(AnalyticsEvent.ProOfferViewed, 'batch');
  }
  enablePreview(): void {
    this.preview.set(!this.preview());
    this.analytics.trackWorkflow(
      AnalyticsEvent.ProCtaClicked,
      'batch',
      'development_preview',
    );
  }
}
