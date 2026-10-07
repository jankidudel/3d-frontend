import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';

@Component({
  selector: 'app-workflow-paths',
  imports: [RouterLink],
  template: `<section
    class="workflow-paths"
    aria-label="Three file-review tasks"
  >
    <h2>Choose the review you need</h2>
    <div class="paths">
      <article>
        <h3>Diagnose one file</h3>
        <p>
          Confirm dimensions, topology and skipped checks before changing
          geometry.
        </p>
        <a [routerLink]="routes.StlPrintPreflight">Check an STL locally</a> ·
        <a [routerLink]="routes.ThreeMfPrintPreflight"
          >Check a 3MF build locally</a
        >
      </article>
      <article>
        <h3>Review a collection</h3>
        <p>
          Keep independent outcomes, replace one revised file and export
          findings for a release or customer.
        </p>
        <a [routerLink]="routes.BatchStlChecker"
          >Open collection review and its mixed example</a
        >
      </article>
      <article>
        <h3>Review a changed export</h3>
        <p>
          Compare original and revised surfaces with explicit units, alignment
          and finite sampling.
        </p>
        <a [routerLink]="routes.StlCompare"
          >Compare revisions and run the cube controls</a
        >
      </article>
    </div>
  </section>`,
  styles: [
    `
      .workflow-paths {
        margin-block: 2rem;
      }
      .paths {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
        gap: 1rem;
      }
      article {
        border: 1px solid var(--border, #cbd5e1);
        border-radius: 1rem;
        padding: 1.25rem;
      }
      h3 {
        margin-top: 0;
      }
      a {
        font-weight: 700;
      }
    `,
  ],
})
export class WorkflowPathsComponent {
  readonly routes = PublicRouteUrl;
}
