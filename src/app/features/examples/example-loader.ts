import {
  PublicRouteSegment,
  PublicRouteUrl,
} from '../../core/seo/public-routes';
import { Component, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
import { findPublicExample, publicExampleChoices } from './example-registry';

export async function fetchPublicExample(
  id: string,
  tool: string,
  index: number,
): Promise<readonly File[]> {
  const example = findPublicExample(id, tool);
  if (!example) {
    throw new Error('Choose a listed public example.');
  }
  const selected = example.files[index];
  const extension =
    tool === PublicRouteUrl.GcodePreflightChecker
      ? '.gcode'
      : tool.startsWith(`/${PublicRouteSegment.Tools}/3mf-`)
        ? '.3mf'
        : '.stl';
  if (!selected || !selected.name.endsWith(extension)) {
    throw new Error('Choose a supported example file.');
  }
  const assets =
    tool === PublicRouteUrl.StlCompare
      ? [example.files[0], selected]
      : [selected];
  return Promise.all(
    assets.map(async (asset) => {
      const response = await fetch(asset.path, { credentials: 'omit' });
      if (!response.ok) {
        throw new Error(
          'The public example could not be downloaded. Try again.',
        );
      }
      const blob = await response.blob();
      if (blob.size !== asset.bytes) {
        throw new Error('The example download is incomplete. Try again.');
      }
      return new File([blob], asset.name);
    }),
  );
}

@Component({
  selector: 'app-example-loader',
  imports: [RouterLink],
  template: `
    <section class="example-loader" aria-labelledby="example-title">
      <h2 id="example-title">Try an example</h2>
      <label
        >Example to try
        <select
          class="select-control"
          [value]="selected().id"
          (change)="choose($event)"
          [disabled]="loading() || busy()"
        >
          @for (example of choices(); track example.id) {
            <option [value]="example.id">{{ example.name }}</option>
          }
        </select>
      </label>
      <p>{{ selected().question }}</p>
      <p><strong>Settings:</strong> {{ selected().settings }}</p>
      <label
        >Example file
        {{ tool() === routeUrl.StlCompare ? '(after revision)' : '' }}
        <select
          class="select-control"
          [value]="chosenIndex()"
          (change)="chooseFile($event)"
          [disabled]="loading() || busy()"
        >
          @for (asset of selected().files; track asset.path; let i = $index) {
            @if (supported(asset.name)) {
              <option [value]="i">
                @if (asset.label) {
                  {{ asset.label }} —
                }
                {{ asset.name }} ({{ asset.bytes }} bytes)
              </option>
            }
          }
        </select>
      </label>
      @if (tool() === routeUrl.StlCompare) {
        <p>
          Before: {{ selected().files[0].name }}. Both revision slots will be
          replaced.
        </p>
      }
      <p>
        Downloads our example file and opens it in your browser.
        {{
          active()
            ? tool() === routeUrl.StlCompare
              ? 'Replaces both revision slots and the result. Preserve any unsaved output first.'
              : 'Replaces your current model and result. Preserve any unsaved output first.'
            : 'Your own file can still be chosen above.'
        }}
      </p>
      <button
        class="button button-secondary"
        type="button"
        (click)="open()"
        [disabled]="loading() || busy()"
      >
        {{
          active()
            ? tool() === routeUrl.StlCompare
              ? 'Replace both revision slots with example'
              : 'Replace current model with example'
            : 'Load example locally'
        }}
      </button>
      <p role="status" aria-live="polite">{{ status() }}</p>
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (loaded()) {
        <p>
          <strong>Expected result:</strong>
          {{ selected().files[chosenIndex()].reference ?? selected().observed }}
        </p>
        <p>{{ selected().limitations }}</p>
      }
      <p>
        <a [routerLink]="selected().guide">Read the explanation</a> ·
        <a [routerLink]="routeUrl.Examples" [fragment]="selected().id"
          >Download all example files</a
        >
        ·
        <a [routerLink]="routeUrl.Methods">How the checks work</a>
      </p>
    </section>
  `,
  styleUrl: './example-loader.scss',
})
export class ExampleLoader {
  readonly routeUrl = PublicRouteUrl;
  readonly tool = input.required<string>();
  readonly active = input(false);
  readonly current = input<unknown>(null);
  private readonly analytics = inject(AnalyticsService);
  readonly busy = input(false);
  readonly load =
    input.required<(files: readonly File[], id: string) => Promise<void>>();
  readonly choices = computed(() => publicExampleChoices(this.tool()));
  private readonly requested =
    inject(ActivatedRoute).snapshot.queryParamMap.get('example') ?? '';
  readonly selectedId = signal('');
  readonly selected = computed(
    () =>
      findPublicExample(this.selectedId() || this.requested, this.tool()) ??
      this.choices()[0],
  );
  readonly fileIndex = signal<number | null>(null);
  readonly chosenIndex = computed(
    () =>
      this.fileIndex() ??
      (this.tool() === this.routeUrl.StlCompare
        ? 1
        : this.selected().files.findIndex((asset) =>
            this.supported(asset.name),
          )),
  );
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly status = signal('');
  readonly error = signal('');
  supported(name: string): boolean {
    return name.endsWith(
      this.tool() === this.routeUrl.GcodePreflightChecker
        ? '.gcode'
        : this.tool().startsWith(`/${PublicRouteSegment.Tools}/3mf-`)
          ? '.3mf'
          : '.stl',
    );
  }
  choose(event: Event): void {
    this.selectedId.set((event.target as HTMLSelectElement).value);
    this.fileIndex.set(null);
    this.loaded.set(false);
    this.status.set('');
    this.error.set('');
  }
  chooseFile(event: Event): void {
    this.fileIndex.set(Number((event.target as HTMLSelectElement).value));
    this.loaded.set(false);
    this.status.set('');
    this.error.set('');
  }
  async open(): Promise<void> {
    if (this.loading() || this.busy()) {
      return;
    }
    const original = this.current();
    this.loading.set(true);
    this.error.set('');
    this.loaded.set(false);
    this.status.set('Downloading the public example...');
    try {
      const files = await fetchPublicExample(
        this.selected().id,
        this.tool(),
        this.chosenIndex(),
      );
      if (this.current() !== original || this.busy()) {
        throw new Error(
          'Your selected model changed during download. Load the example again only when you want to replace it.',
        );
      }
      this.status.set('Opening the example locally...');
      await this.load()(files, this.selected().id);
      this.loaded.set(true);
      this.analytics.trackWorkflow(
        AnalyticsEvent.ExampleLoaded,
        this.tool().split('/').at(-1)!,
        this.selected().id,
      );
      this.status.set(
        'Example opened locally. Review this tool’s actual result below.',
      );
    } catch (error: unknown) {
      this.status.set('');
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The example could not be opened.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
