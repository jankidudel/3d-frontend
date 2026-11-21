import { Component, input } from '@angular/core';
import { WallThicknessReport } from './wall-thickness-model';
import {
  roundedThickness,
  wallThicknessNextAction,
  wallThicknessOutcomeText,
} from './wall-thickness-result';

@Component({
  selector: 'app-wall-thickness-summary',
  template: `
    <div role="status" aria-live="polite">
      <h3>{{ outcome(report()) }}</h3>
      <p>{{ nextAction(report()) }}</p>
      @if (report().unmeasured > 0) {
        <p class="warning">
          {{ report().unmeasured }} attempted samples had no accepted opposing
          hit. Inspect open or ambiguous geometry; this can coexist with
          below-threshold findings.
        </p>
      }
      @if (unsampled() > 0 || report().unmeasured > 0) {
        <p class="warning">
          Sampling is incomplete: {{ unsampled() }} triangles were not selected
          and {{ report().unmeasured }} selected locations were unmeasured.
        </p>
      }
    </div>
    <dl class="metrics">
      <div>
        <dt>Review threshold used</dt>
        <dd>{{ report().threshold }} {{ report().unit }}</dd>
      </div>
      <div>
        <dt>Samples attempted</dt>
        <dd>{{ report().samples.length }}</dd>
      </div>
      <div>
        <dt>Samples measured</dt>
        <dd>{{ report().measured }}</dd>
      </div>
      <div>
        <dt>Below your review threshold</dt>
        <dd>{{ report().belowThreshold }}</dd>
      </div>
      <div>
        <dt>Samples unmeasured</dt>
        <dd>{{ report().unmeasured }}</dd>
      </div>
      <div>
        <dt>Triangles not sampled</dt>
        <dd>{{ unsampled() }}</dd>
      </div>
      @if (report().minimum !== null) {
        <div>
          <dt>Smallest measured sample</dt>
          <dd>{{ format(report().minimum) }} {{ report().unit }}</dd>
        </div>
      }
    </dl>
    <p class="hint">
      Counts describe sampled rays, not a count of physical defects. Attempted =
      measured + unmeasured; triangles not sampled are separate.
    </p>
  `,
})
export class WallThicknessSummaryComponent {
  readonly report = input.required<WallThicknessReport>();
  readonly triangleCount = input.required<number>();
  readonly outcome = wallThicknessOutcomeText;
  readonly nextAction = wallThicknessNextAction;
  readonly format = roundedThickness;
  unsampled(): number {
    return Math.max(0, this.triangleCount() - this.report().samples.length);
  }
}
