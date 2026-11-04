import { PublicRouteUrl } from '../../core/seo/public-routes';
import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { publicExamples, type PublicExample } from './example-registry';

@Component({
  selector: 'app-examples-page',
  imports: [NgOptimizedImage, RouterLink],
  template: `
    <main class="page examples-page">
      <p class="eyebrow">Known geometry, reproducible questions</p>
      <h1>Explore model and G-code evidence controls</h1>
      <p class="lead">
        Recognise a finding, download a small owned analytical control and try
        it in the tool. Each example separates generated geometry from observed
        software output and the decision you still need to make.
      </p>
      <p>
        Models are original InspectMesh mathematical geometry. G-code parser
        snippets are hand-authored analytical controls, incomplete and never for
        printer execution. All controls are available to download, modify and
        redistribute with attribution to InspectMesh. They contain no customer
        data. Slicer exports are preview-only records, never instructions to run
        a printer. No physical print success is claimed.
      </p>
      <p>
        <a [routerLink]="routeUrl.Methods">Read methods and processing</a>
        for analysis scope and local versus optional server actions. The linked
        guide owns the full explanation; these cards help you choose a control.
      </p>
      <fieldset class="example-filters">
        <legend>Filter by topic</legend>
        <div class="filter-buttons">
          @for (group of groups; track group) {
            <button
              type="button"
              [attr.aria-pressed]="selectedGroups().includes(group)"
              (click)="toggleGroup(group)"
            >
              {{ group }}
            </button>
          }
          <button
            type="button"
            class="filter-reset"
            [attr.aria-disabled]="selectedGroups().length === 0"
            (click)="selectedGroups.set([])"
          >
            Clear filters
          </button>
        </div>
        <p class="result-count" role="status">
          {{ visibleExamples().length }} of {{ examples.length }} examples
        </p>
      </fieldset>
      <div class="example-grid">
        @for (example of visibleExamples(); track example.id) {
          <article
            class="card"
            [class.example-wide]="!!example.previewCaption"
            [id]="example.id"
            [attr.aria-labelledby]="example.id + '-title'"
          >
            <span class="example-category">{{ example.group }}</span>
            <h2 [id]="example.id + '-title'">{{ example.name }}</h2>
            <figure>
              <div
                [class.path-scroll]="!!example.previewCaption"
                [attr.tabindex]="example.previewCaption ? 0 : null"
                [attr.role]="example.previewCaption ? 'region' : null"
                [attr.aria-label]="
                  example.previewCaption
                    ? example.name + ', scroll paths horizontally'
                    : null
                "
              >
                <img
                  [ngSrc]="example.preview"
                  [width]="example.previewWidth ?? 720"
                  [height]="example.previewHeight ?? 260"
                  [class.output-figure]="!!example.previewCaption"
                  [alt]="example.alt"
                />
              </div>
              <figcaption>
                {{
                  example.previewCaption ??
                    'Original explanatory diagram. Use the files to reproduce the reported observation.'
                }}
              </figcaption>
            </figure>
            <p>
              <strong>{{ example.question }}</strong>
            </p>
            <p><strong>Known geometry:</strong> {{ example.known }}</p>
            <p>
              <strong>Reproduction settings:</strong> {{ example.settings }}
            </p>
            <p><strong>Software observation:</strong> {{ example.observed }}</p>
            <p>{{ example.limitations }}</p>
            <ul>
              @for (asset of example.files; track asset.path) {
                <li>
                  <a [href]="asset.path" download
                    >{{ asset.label ? asset.label + ' - ' : ''
                    }}{{ asset.name }}</a
                  >
                  · {{ asset.bytes }} bytes
                </li>
              }
            </ul>
            <p>
              @for (tool of example.tools; track tool) {
                <a [routerLink]="tool" [queryParams]="{ example: example.id }"
                  >Try in {{ toolName(tool) }}</a
                >
                ·
              }
              <a [routerLink]="example.guide">Read the explanation</a>
            </p>
            @if (example.relatedGuides; as guides) {
              <ul aria-label="Related interface decisions">
                @for (guide of guides; track guide.route) {
                  <li>
                    <a [routerLink]="guide.route">{{ guide.label }}</a>
                  </li>
                }
              </ul>
            }
          </article>
        }
      </div>
    </main>
  `,
  styles: `
    .examples-page {
      max-width: 72rem;
    }
    .example-filters {
      min-inline-size: 0;
      margin: 1.5rem 0;
      padding: 0;
      border: 0;
    }
    .example-filters legend {
      margin-bottom: 0.25rem;
      padding: 0;
      font-size: 0.875rem;
      font-weight: 700;
    }
    .result-count {
      margin: 0.35rem 0 0;
      color: var(--muted);
      font-size: 0.9rem;
    }
    .example-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: stretch;
      gap: 1.25rem;
    }
    article {
      min-width: 0;
      padding: clamp(1rem, 3vw, 1.5rem);
      scroll-margin-top: 6rem;
    }
    .example-wide {
      grid-column: 1 / -1;
    }
    .example-category {
      display: inline-flex;
      max-width: 100%;
      margin-bottom: 0.75rem;
      padding: 0.3rem 0.7rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: #edf6ef;
      color: var(--primary);
      font-size: 0.85rem;
      font-weight: 700;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    h2 {
      margin: 0 0 1rem;
      font-size: 1.2rem;
      line-height: 1.3;
    }
    figure {
      margin: 0 0 1.25rem;
    }
    img {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 36 / 13;
      object-fit: contain;
      background: #eef4fa;
      border-radius: 0.75rem;
    }
    figcaption {
      margin-top: 0.65rem;
      color: var(--muted);
      font-size: 0.9rem;
      line-height: 1.5;
    }
    img.output-figure {
      aspect-ratio: auto;
      min-width: 67.5rem;
    }
    .path-scroll {
      max-width: 100%;
      overflow-x: auto;
    }
    .path-scroll:focus-visible {
      outline: 3px solid #0369a1;
      outline-offset: 3px;
    }
    article p {
      margin-block: 1rem;
      line-height: 1.6;
    }
    article p:last-child {
      margin-bottom: 0;
    }
    ul {
      padding-left: 1.25rem;
    }
    li {
      margin-block: 0.5rem;
      line-height: 1.5;
    }
    li,
    p {
      overflow-wrap: anywhere;
    }
    @media (max-width: 55rem) {
      .example-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ExamplesPage {
  readonly routeUrl = PublicRouteUrl;
  readonly groups = [
    ...new Set(publicExamples.map((example) => example.group)),
  ];
  readonly examples = this.groups.flatMap((group) =>
    publicExamples.filter((example) => example.group === group),
  );
  protected readonly selectedGroups = signal<readonly string[]>([]);
  protected readonly visibleExamples = computed(() => {
    const selected = this.selectedGroups();
    const ordered: PublicExample[] = [];
    let unpaired: PublicExample | undefined;

    for (const example of this.examples) {
      if (selected.length > 0 && !selected.includes(example.group)) {
        continue;
      }
      if (example.previewCaption) {
        // Keep the pending half-width card for the next pair.
        ordered.push(example);
      } else if (unpaired) {
        ordered.push(unpaired, example);
        unpaired = undefined;
      } else {
        unpaired = example;
      }
    }
    if (unpaired) {
      ordered.push(unpaired);
    }
    return ordered;
  });
  constructor() {
    inject(SeoService).apply({
      title:
        'Model and G-code Evidence Controls - Visual Diagnosis | InspectMesh',
      description:
        'Download original known-geometry controls for orientation, bridge and overhang comparison, internal support access, 3MF transforms and mesh diagnosis.',
      path: PublicRouteUrl.Examples,
    });
  }
  protected toggleGroup(group: string): void {
    this.selectedGroups.update((selected) =>
      selected.includes(group)
        ? selected.filter((item) => item !== group)
        : [...selected, group],
    );
  }
  toolName(path: string): string {
    return (path.split('/').at(-1) ?? '').replaceAll('-', ' ');
  }
}
