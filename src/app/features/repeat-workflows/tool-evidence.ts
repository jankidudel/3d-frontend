import { Component, inject, input } from '@angular/core';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
interface ToolEvidence {
  readonly heading: string;
  readonly example: string;
  readonly interpretation: string;
  readonly next: string;
  readonly cta: string;
}
export const toolEvidence: Readonly<Record<string, ToolEvidence>> = {
  [PublicRouteUrl.StlPrintPreflight]: {
    heading: 'Known geometry before a collection review',
    example:
      'Run the mixed batch collection to reproduce a closed 20 mm cube (12 triangles, screened 8,000 mm\u00b3 volume), an open-face cube (four boundary edges, volume unavailable), and malformed input. A failed file is distinct from a completed mesh with no findings.',
    interpretation:
      'Separate completed topology checks from sampled wall rays and skipped printer fit. Choose the STL unit explicitly: the same 20-unit fixture interpreted as inches is 508 mm wide. Keep the original unchanged and check a repaired copy separately.',
    next: PublicRouteUrl.BatchStlChecker,
    cta: 'Review more files consistently',
  },
  [PublicRouteUrl.ThreeMfPrintPreflight]: {
    heading: 'Interpret the resolved 3MF build',
    example:
      'A mesh-based 3MF can declare physical units and place build items with transforms. Review the resolved dimensions, not just one object in the archive. Missing explicit units use the format default; unsupported package behaviour must stay unresolved rather than receive a clean badge.',
    interpretation:
      'A two-item build can contain legitimate disconnected parts. Shared topology and volume interpretation need care: multiple shells do not automatically establish a single solid. Fit uses the selected nominal printer box and does not validate slicer reservations, embedded profiles or supports.',
    next: PublicRouteUrl.BatchStlChecker,
    cta: 'Check supported 3MF collections',
  },
  [PublicRouteUrl.QualityCheck]: {
    heading: 'Use defect fixtures to interpret a quality report',
    example:
      'Deleting a square face from a 20 mm cube creates four boundary edges. Adding one duplicate face creates three edges shared by more than two triangles. A repeated-vertex triangle is degenerate. Two separate closed cubes have two shells; their design intent still needs review.',
    interpretation:
      'These owned software fixtures are available through the batch workflow and its report. Geometry counts are findings, not a physical printability guarantee. Choose the correction from the actual defect and verify the new export against the original dimensions and shape.',
    next: PublicRouteUrl.BatchStlChecker,
    cta: 'Open a mixed collection example',
  },
  [PublicRouteUrl.DimensionsChecker]: {
    heading: 'Reproduce a unit error and a fit decision',
    example:
      'A 2-unit CAD width intended as inches is 50.8 mm, not 2 mm. Confirm a known reference dimension before applying a 25.4 correction. The batch cube similarly changes from 20 mm to 508 mm under an inch interpretation, without changing its source coordinates.',
    interpretation:
      'An illustrative 250 \u00d7 210 \u00d7 180 mm box cannot fit a nominal 180 mm cube bed in any right-angle orientation. It fits a nominal 256 mm cube geometrically, but its 6 mm margin on one axis does not reserve space for brims or excluded regions. Check the real slicer bed before printing.',
    next: PublicRouteUrl.PrinterFitChecker,
    cta: 'Compare the same model against named printers',
  },
  [PublicRouteUrl.StlWallThicknessChecker]: {
    heading: 'Connect geometry samples to actual extrusion width',
    example:
      'For a 0.4 mm nozzle, 0.45 mm actual line width and 1.3 mm CAD wall, three equal-width lines give 1.35 mm nominal thickness. That arithmetic is not the slicer toolpath. Variable-width generators, line overlap and extrusion shape can change the result.',
    interpretation:
      'A normal-direction ray that finds no opposing hit is unmeasured, not zero or safe. The threshold is a review input; finite sampling can miss a thin corner or rib. Inspect the identified geometry and the actual sliced layer rather than claiming the entire part meets a strength specification.',
    next: PublicRouteUrl.NozzleLayerHeightCalculator,
    cta: 'Plan nozzle, line width and walls',
  },
  [PublicRouteUrl.PrintCostCalculator]: {
    heading: 'A complete material and energy example',
    example:
      'Illustrative job: 80 g of parts/support plus 20 g separately reported purge at 24 currency units/kg costs 2.40 in material. A 4-hour run averaging 120 W uses 0.48 kWh; at 0.30 per kWh that is 0.144. Add purge only when it is absent from the slicer total.',
    interpretation:
      'Use observed average power and complete sliced consumption where available. Keep waste already included in the input separate from an additional failure allowance. A percentage uplift is a budgeting choice, not proof of how often your jobs will fail. Currency selection changes the label, not an exchange rate.',
    next: PublicRouteUrl.FilamentRemainingCalculator,
    cta: 'Check the remaining spool against this job',
  },
  [PublicRouteUrl.PrintPriceCalculator]: {
    heading: 'Spread order setup once across a batch',
    example:
      'Illustrative five-part order: production costs 4.00 per part and one setup/packing charge is 10.00. Total cost is 30.00, or 6.00 allocated per part. A 30% margin calls for 30 / 0.70 = 42.86 for the order; a 30% markup gives 39.00 and a lower margin.',
    interpretation:
      'Distinguish per-item, per-plate and per-order labour. Five separate runs can repeat unloading even if the customer ordered once. Enter explicit currency, shipping and tax assumptions, then retain the quote inputs with the supplied file review. Browser-local calculations are not invoices or cloud customer records.',
    next: PublicRouteUrl.BatchStlChecker,
    cta: 'Keep a file-review report with the quote',
  },
  [PublicRouteUrl.FilamentLengthCalculator]: {
    heading: 'Conversion is different from partial-spool sufficiency',
    example:
      'A known filament mass converts to approximate length using circular cross-section and density. For a remaining spool, first subtract the measured empty reel: 350 g gross - 200 g tare = 150 g. Subtracting a 20 g reserve leaves 130 g usable, enough for two 45 g copies.',
    interpretation:
      'Use the exact product density when available; filled formulations and diameter variation change length. This conversion page does not know supports, purge or the whole job estimate. The partial-spool tool owns the decision about what can actually be completed from usable stock.',
    next: PublicRouteUrl.FilamentRemainingCalculator,
    cta: 'Check complete-job sufficiency',
  },
  [PublicRouteUrl.FlowRateCalculator]: {
    heading: 'Calibration and throughput answer different questions',
    example:
      'Changing an extrusion multiplier addresses the relationship between commanded and delivered extrusion. Requested volumetric flow is approximately width \u00d7 height \u00d7 linear speed: 0.45 mm \u00d7 0.2 mm \u00d7 100 mm/s = 9 mm\u00b3/s. A calibrated multiplier does not establish a hotend flow ceiling.',
    interpretation:
      'A throughput limit needs a relevant test or exact profile source with hotend, nozzle, material and temperature context. Do not substitute a material-name default. The flow planner leaves capacity unknown when no evidence is entered and does not portray a computed speed as a suitable machine setting.',
    next: PublicRouteUrl.VolumetricFlowCalculator,
    cta: 'Calculate requested volumetric throughput',
  },
  [PublicRouteUrl.GcodePreflightChecker]: {
    heading: 'Carry a slicer estimate into finish planning',
    example:
      'A supported duration comment is the slicer estimate, not a recreation of firmware timing. For an illustrative comparable job that took 6 hours against a 5-hour estimate, an observed correction factor is 1.2. Use it cautiously for similar work and avoid adding warm-up twice.',
    interpretation:
      'The finish planner resolves a chosen start in a timezone and adds elapsed duration across midnight and daylight-saving changes. It accepts supported text G-code duration metadata and manual edits. It does not monitor a running printer or infer accurate elapsed time from STL size.',
    next: PublicRouteUrl.PrintFinishTimeCalculator,
    cta: 'Estimate the finish date and time',
  },
  [PublicRouteUrl.PrinterFitChecker]: {
    heading: 'Compare nominal bed fit without changing intended scale',
    example:
      'An illustrative 250 \u00d7 210 \u00d7 180 mm bounding box fails a 180 \u00d7 180 \u00d7 180 mm A1 Mini envelope and fits the A1 nominal 256 mm cube. A 200 \u00d7 100 \u00d7 50 mm box on a 180 \u00d7 180 \u00d7 250 mm envelope can fit when its 200 mm axis is upright.',
    interpretation:
      'These are geometric box decisions. Do not equate nominal fit with available brim clearance, support practicality or wearer fit for a helmet. Verify the model footprint in the actual slicer; split or scale only when the changed real-world dimensions and joints are acceptable.',
    next: PublicRouteUrl.BatchStlChecker,
    cta: 'Record printer fit consistently across a collection',
  },
  [PublicRouteUrl.OrientationPlanner]: {
    heading: 'Recheck filament and fit after changing orientation',
    example:
      'Rotating a 200 \u00d7 100 \u00d7 50 mm box so the 200 mm axis is vertical can fit a nominal 180 \u00d7 180 \u00d7 250 mm envelope that rejects the original horizontal width. That same choice can reduce contact area and alter supports, layer direction and elapsed time.',
    interpretation:
      'Compare the actual sliced layers, supports and complete consumption before deciding. An orientation that fits a box is not a guarantee of strength or print success. Feed the updated slicer estimate into the spool planner rather than reusing a different orientation\u2019s material figure.',
    next: PublicRouteUrl.FilamentRemainingCalculator,
    cta: 'Check the updated job estimate against your spool',
  },
};
@Component({
  selector: 'app-tool-evidence',

  template: `@if (evidence(); as item) {
    <section class="workflow-evidence">
      @if (completed()) {
        <p class="result-next">
          You have a result to review.
          <a [href]="item.next" (click)="track()">{{ item.cta }}</a>
        </p>
      }
      <h2>{{ item.heading }}</h2>
      <p>{{ item.example }}</p>
      <h3>Interpret the result and choose the next step</h3>
      <p>{{ item.interpretation }}</p>
      <a [href]="item.next" (click)="track()">{{ item.cta }}</a>
      <p>
        <a href="/examples/english-market-batch/closed-20mm-cube.stl" download
          >Download the owned 20 mm cube sample</a
        >, or
        <a
          href="/examples/english-market-batch/declared-inch-transformed.3mf"
          download
          >the declared-inch 3MF sample</a
        >. For a G-code preview, use the
        <a href="/examples/english-market-batch/thin-arachne.gcode" download
          >actual Arachne slicer export</a
        >. Model samples are illustrative geometry; the G-code is for inspection
        and must not be sent to a printer.
      </p>
      <p>
        Numerical scenarios are illustrative software examples, not physical
        print tests.
      </p>
    </section>
  }`,
  styles: [
    `
      .workflow-evidence {
        border: 1px solid #cbd5e1;
        border-radius: 1rem;
        padding: 1.5rem;
        margin-block: 2rem;
      }
    `,
  ],
})
export class ToolEvidenceComponent {
  readonly page = input.required<string>();
  readonly completed = input(false);
  readonly evidence = () => toolEvidence[this.page()];
  private readonly analytics = inject(AnalyticsService);
  track(): void {
    this.analytics.trackWorkflow(
      AnalyticsEvent.WorkflowCtaClicked,
      'contextual_workflow',
      'cta_opened',
    );
  }
}
