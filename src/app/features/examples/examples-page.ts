import { PublicRouteUrl } from '../../core/seo/public-routes';
import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { publicExamples } from './example-registry';

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
      <nav aria-label="Example topics">
        @for (group of groups; track group) {
          <a [href]="'#' + firstId(group)">{{ group }}</a>
        }
      </nav>
      @for (group of groups; track group) {
        <section [attr.aria-label]="group">
          <h2>{{ group }}</h2>
          <div class="example-grid">
            @for (example of inGroup(group); track example.id) {
              <article class="card" [id]="example.id">
                <h3>{{ example.name }}</h3>
                <figure>
                  <img
                    [ngSrc]="example.preview"
                    width="720"
                    height="260"
                    [alt]="example.alt"
                  />
                  <figcaption>
                    Original explanatory diagram. Use the files to reproduce the
                    reported observation.
                  </figcaption>
                </figure>
                <p>
                  <strong>{{ example.question }}</strong>
                </p>
                <p><strong>Known geometry:</strong> {{ example.known }}</p>
                <p>
                  <strong>Software observation:</strong> {{ example.observed }}
                </p>
                <p>{{ example.limitations }}</p>
                <ul>
                  @for (asset of example.files; track asset.path) {
                    <li>
                      <a [href]="asset.path" download>{{ asset.name }}</a> ·
                      {{ asset.bytes }} bytes
                    </li>
                  }
                </ul>
                <p>
                  <a
                    [routerLink]="example.tools[0]"
                    [queryParams]="{ example: example.id }"
                    >Try in {{ toolName(example.tools[0]) }}</a
                  >
                  · <a [routerLink]="example.guide">Read the explanation</a>
                </p>
              </article>
            }
          </div>
        </section>
      }
    </main>
  `,
  styles: `
    .examples-page {
      max-width: 72rem;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-block: 1.5rem;
    }
    nav a {
      display: inline-flex;
      align-items: center;
      min-height: 2.75rem;
      padding: 0.5rem 0.85rem;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      background: var(--surface);
    }
    .example-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 28rem), 1fr));
      align-items: start;
      gap: 1.25rem;
    }
    article {
      min-width: 0;
      padding: clamp(1rem, 3vw, 1.5rem);
      scroll-margin-top: 6rem;
    }
    h3 {
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
      border-radius: 0.75rem;
    }
    figcaption {
      margin-top: 0.65rem;
      color: var(--muted);
      font-size: 0.9rem;
      line-height: 1.5;
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
    section {
      margin-top: 2rem;
    }
  `,
})
export class ExamplesPage {
  readonly routeUrl = PublicRouteUrl;
  readonly groups = [
    ...new Set(publicExamples.map((example) => example.group)),
  ];
  constructor() {
    inject(SeoService).apply({
      title:
        'Model and G-code Evidence Controls - Visual Diagnosis | InspectMesh',
      description:
        'Download original known-geometry controls to explore units, open edges, winding, thin features, simplification, 3MF placements and nominal printer fit.',
      path: '/examples',
    });
  }
  inGroup(group: string) {
    return publicExamples.filter((example) => example.group === group);
  }
  firstId(group: string): string {
    return this.inGroup(group)[0].id;
  }
  toolName(path: string): string {
    return path.slice(1).replaceAll('-', ' ');
  }
}
