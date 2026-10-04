import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { printers } from '../printer-comparison/printer-catalogue';
import { MeshExample, exampleFile } from './example-meshes';
import {
  CheckSettings,
  GeometryCheck,
  QueueState,
  ModelUnits,
  WorkflowLimits,
  collectionAllowance,
  csvCell,
} from './mesh-workflows';
import { loadWorkflowModel } from './load-model';
import { MeshWorkerMode, runMeshWorker } from './mesh-worker';

export const ReportFormat = { Json: 'json', Csv: 'csv' } as const;
export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];
interface QueueEntry {
  id: number;
  name: string;
  state: QueueState;
  error: string;
  result: GeometryCheck | null;
  unit: string;
  warnings: readonly string[];
  durationMs: number;
}
const REPORT_VERSION = 'inspectmesh-mesh-check-1';
const HISTORY_KEY = 'inspectmesh-local-batch-reports-v1';
const BatchFilter = {
  All: 'all',
  Attention: 'attention',
  Failed: 'failed',
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
  readonly rows = signal<readonly QueueEntry[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly unit = signal<ModelUnits>(ModelUnits.Millimetres);
  readonly printerId = signal('');
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
  readonly completed = computed(
    () => this.rows().filter((row) => row.state === QueueState.Complete).length,
  );
  readonly visible = computed(() => {
    const rows = this.rows().filter(
      (row) =>
        this.filter() === BatchFilter.All ||
        (this.filter() === BatchFilter.Failed
          ? row.state === QueueState.Failed
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
  readonly history = signal<
    readonly { date: string; files: number; report: string }[]
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
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
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
      await this.process([await ownedDemoFile(DemoAsset.Package)]);
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The example could not be loaded.',
      );
    }
  }
  async example(): Promise<void> {
    this.analytics.trackWorkflow(AnalyticsEvent.ExampleLoaded, 'batch');
    await this.process([
      exampleFile(MeshExample.Cube),
      exampleFile(MeshExample.Open),
      new File(['malformed'], 'malformed.stl'),
    ]);
  }
  async process(files: readonly File[]): Promise<void> {
    if (this.busy() || !files.length) {
      return;
    }
    this.error.set('');
    if (files.length > this.allowance()) {
      this.error.set(
        `Choose up to ${this.allowance()} files. The free allowance is ${WorkflowLimits.FreeQueue}; a larger collection is available only in the isolated development preview.`,
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
    this.settings = {
      stlUnit: this.unit(),
      thicknessThresholdMm: this.threshold(),
      printer: printer
        ? { name: printer.displayName, dimensions: printer.buildVolumeMm }
        : null,
    };
    const settings = this.settings;
    this.controller = new AbortController();
    const controller = this.controller;
    this.busy.set(true);
    this.rows.set(
      files.map((file, id) => ({
        id,
        name: file.name,
        state: QueueState.Waiting,
        error: '',
        result: null,
        unit: '',
        warnings: [],
        durationMs: 0,
      })),
    );
    this.analytics.trackWorkflow(
      AnalyticsEvent.BatchOpened,
      'batch',
      files.length <= 3 ? '1_to_3' : '4_to_20',
    );
    try {
      for (let id = 0; id < files.length; id++) {
        if (controller.signal.aborted) {
          break;
        }
        const started = performance.now();
        this.update(id, { state: QueueState.Reading });
        try {
          const loaded = await loadWorkflowModel(files[id], settings.stlUnit);
          if (controller.signal.aborted) {
            break;
          }
          this.update(id, {
            state: QueueState.Checking,
            unit: loaded.unit,
            warnings: loaded.warnings,
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
          'batch',
          this.completed() <= 3 ? '1_to_3' : '4_to_20',
        );
      }
    } finally {
      this.busy.set(false);
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
    const result = row.result;
    return (
      row.state === QueueState.Failed ||
      (!!result &&
        (result.topology.openEdges > 0 ||
          result.topology.nonManifoldEdges > 0 ||
          result.topology.degenerateTriangles > 0 ||
          result.topology.duplicateTriangles > 0 ||
          result.topology.orientationConflicts > 0 ||
          result.fit === false ||
          (result.thickness?.belowThreshold ?? 0) > 0))
    );
  }
  report(): string {
    return JSON.stringify(
      {
        schema: REPORT_VERSION,
        generatedAt: new Date().toISOString(),
        settings: this.settings,
        distanceUnit: 'mm',
        volumeUnit: 'mm³',
        limitations:
          'Original files are unchanged. These mesh screens do not guarantee printing. Local browser report only.',
        files: this.rows(),
      },
      null,
      2,
    );
  }
  export(format: ReportFormat): void {
    const header = [
      'file',
      'state',
      'declared_or_assumed_unit',
      'triangles',
      'width_mm',
      'height_mm',
      'depth_mm',
      'open_edges',
      'non_manifold_edges',
      'shells',
      'volume_valid',
      'volume_mm3',
      'printer_fit',
      'wall_samples',
      'wall_below_threshold',
      'warnings',
      'error',
    ];
    const csv = [
      header,
      ...this.rows().map((row) => {
        const r = row.result;
        return [
          row.name,
          row.state,
          row.unit,
          r?.triangles,
          r?.dimensionsMm.width,
          r?.dimensionsMm.height,
          r?.dimensionsMm.depth,
          r?.topology.openEdges,
          r?.topology.nonManifoldEdges,
          r?.topology.shells,
          r?.topology.volumeReliable,
          r?.topology.volume,
          r?.fit === null ? 'skipped' : r?.fit,
          r?.thickness?.samples,
          r?.thickness?.belowThreshold,
          [...row.warnings, ...(r?.skipped ?? [])].join('; '),
          row.error,
        ];
      }),
    ]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n');
    const contents =
      format === ReportFormat.Json
        ? this.report()
        : `${['schema', REPORT_VERSION, 'settings', JSON.stringify(this.settings)].map(csvCell).join(',')}\r\n${csv}`;
    this.download(contents, format);
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
    anchor.download = `inspectmesh-batch-report.${extension}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
