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
      <p class="eyebrow">Free example files</p>
      <h1>Free STL, 3MF and G-code Example Files for Testing</h1>
      <p class="lead">
        Download small example files with one known problem each (a hole, a
        duplicate face, a wrong unit, a tricky overhang and more) and open them
        in our tools to see exactly what that problem looks like before you
        check your own model.
      </p>
      <p>
        All models are original shapes made by InspectMesh, and you may
        download, change and share them with credit to InspectMesh. They contain
        no customer data. The G-code files are hand-written test snippets or
        slicer exports for viewing only: never run them on a printer. These are
        software examples, not print tests.
      </p>
      <p>
        <a [routerLink]="routeUrl.Methods">How InspectMesh checks files</a>
        explains what each check covers and which tools upload. Each card links
        to a guide with the full explanation.
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
                    'Diagram of the example. Download the files to see the same result in the tool.'
                }}
              </figcaption>
            </figure>
            <p>
              <strong>{{ example.question }}</strong>
            </p>
            <p><strong>What the file contains:</strong> {{ example.known }}</p>
            <p><strong>Settings to use:</strong> {{ example.settings }}</p>
            <p><strong>What our tool shows:</strong> {{ example.observed }}</p>
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
              <ul aria-label="Related guides">
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
      /* Scale to the card; scroll only once labels would become too small. */
      min-width: 50rem;
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
      title: 'Free STL, 3MF and G-code Test Files | InspectMesh',
      description:
        'Free example STL, 3MF and G-code files, each with one known problem such as a hole, duplicate face or wrong unit, to try in our checking tools.',
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
