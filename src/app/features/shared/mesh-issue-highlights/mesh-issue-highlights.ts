import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  MeshIssueEdgeSegments,
  MeshQualityReport,
} from '../../../models/mesh-quality-report';
import { ViewerIssueLine } from '../object-viewer/object-viewer';

@Component({
  selector: 'app-mesh-issue-highlights',
  host: { class: 'viewer-issues' },
  templateUrl: './mesh-issue-highlights.html',
  styleUrl: './mesh-issue-highlights.scss',
})
export class MeshIssueHighlightsComponent {
  readonly report = input<MeshQualityReport | null>(null);
  readonly centre = input.required<readonly [number, number, number]>();
  readonly analyzing = input(false);
  readonly error = input('');
  readonly analysisDescription = input.required<string>();
  readonly analyzeRequested = output<void>();
  readonly linesChange = output<readonly ViewerIssueLine[]>();
  readonly showOpenEdges = signal(false);
  readonly showNonManifoldEdges = signal(false);
  readonly geometry = computed(() => this.report()?.issueGeometry);
  readonly lines = computed(() => {
    const geometry = this.geometry();
    const centre = this.centre();
    if (!geometry) return [];
    const lines: ViewerIssueLine[] = [];
    if (this.showOpenEdges()) {
      lines.push(this.toViewerLine(geometry.openEdges, centre, '#e69f00'));
    }
    if (this.showNonManifoldEdges()) {
      lines.push(
        this.toViewerLine(geometry.nonManifoldEdges, centre, '#cc79a7'),
      );
    }
    return lines.filter((line) => line.positions.length > 0);
  });

  constructor() {
    effect(() => {
      const geometry = this.geometry();
      this.showOpenEdges.set((geometry?.openEdges?.returnedCount ?? 0) > 0);
      this.showNonManifoldEdges.set(
        (geometry?.nonManifoldEdges?.returnedCount ?? 0) > 0,
      );
    });
    effect(() => this.linesChange.emit(this.lines()));
  }

  clearHighlights(): void {
    this.showOpenEdges.set(false);
    this.showNonManifoldEdges.set(false);
  }

  setOpenEdges(event: Event): void {
    this.showOpenEdges.set((event.target as HTMLInputElement).checked);
  }

  setNonManifoldEdges(event: Event): void {
    this.showNonManifoldEdges.set((event.target as HTMLInputElement).checked);
  }

  private toViewerLine(
    issue: MeshIssueEdgeSegments | undefined,
    centre: readonly [number, number, number],
    color: string,
  ): ViewerIssueLine {
    const positions: number[] = [];
    for (const segment of issue?.segments ?? []) {
      const start = this.point(segment.start);
      const end = this.point(segment.end);
      if (start && end) {
        positions.push(
          start[0] - centre[0],
          start[1] - centre[1],
          start[2] - centre[2],
          end[0] - centre[0],
          end[1] - centre[1],
          end[2] - centre[2],
        );
      }
    }
    return { color, positions };
  }

  private point(value: unknown): readonly [number, number, number] | null {
    if (
      Array.isArray(value) &&
      value.length === 3 &&
      value.every(
        (coordinate) =>
          typeof coordinate === 'number' && Number.isFinite(coordinate),
      )
    ) {
      return value as [number, number, number];
    }
    if (typeof value === 'object' && value !== null) {
      const point = value as { x?: unknown; y?: unknown; z?: unknown };
      if (
        [point.x, point.y, point.z].every(
          (coordinate) =>
            typeof coordinate === 'number' && Number.isFinite(coordinate),
        )
      ) {
        return [point.x as number, point.y as number, point.z as number];
      }
    }
    return null;
  }
}
