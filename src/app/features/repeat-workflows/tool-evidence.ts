import { Component, inject, input } from '@angular/core';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { ExampleAsset } from '../examples/example-assets';
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
  readonly guide?: string;
  readonly guideLabel?: string;
}
export const toolEvidence: Readonly<Record<string, ToolEvidence>> = {
  [PublicRouteUrl.Viewer]: {
    heading:
      'Visual review has a different privacy boundary from issue analysis',
    example:
      'A closed 20-unit cube displays 20-unit spans and 12 triangles. Choose millimetres for a 20 mm software control; choosing inches means 508 mm. A visible opening or internal shell needs further review even when the silhouette looks normal.',
    interpretation:
      'Ordinary viewing and point measurements run locally with a 25 MiB file limit. The optional Locate mesh issues analysis uploads your file through the Quality Checker when explicitly requested. Rendering is not topology validation or certified dimensional metrology.',
    next: PublicRouteUrl.StlPrintPreflight,
    cta: 'Run a local preflight before repair',
    guide: PublicRouteUrl.MeshIntersectionsGuide,
    guideLabel: 'Distinguish visible crossings from connectivity checks',
  },
  [PublicRouteUrl.StlRepair]: {
    heading: 'Local part removal and explicit server cleanup',
    example:
      'The owned cube plus an exact duplicate triangle has 13 faces. Removing that duplicate should restore 12 without inventing a surface. A missing whole cube face is a different problem: cleanup cannot recreate its intended design.',
    interpretation:
      'Standard STL cleanup explicitly uploads your selected file, up to the current 25 MiB guest limit, for server processing. Disconnected-piece detection and selection-only export run locally and never silently combine with that action. STL has no declared unit. Review the actual removal counts and skipped reasons, download the separate copy, then reselect it for preflight and revision comparison. No unconditional printability claim is made.',
    next: PublicRouteUrl.StlCompare,
    cta: 'Compare input and cleaned STL surfaces',
    guide: '/how-to-repair-an-stl-file',
    guideLabel: 'Choose a repair and protect intentional openings',
  },
  [PublicRouteUrl.ThreeMfRepair]: {
    heading:
      'Preserve package structure while removing supported defective faces',
    example:
      'A repeated mesh triangle can be removed locally without filling a hole. The applied before/after counts show which supported duplicate, degenerate or invalid-index faces changed. Confirm declared units and resolved placement after saving.',
    interpretation:
      'Choose a supported mesh-based 3MF up to the 25 MiB guest file limit. This tool processes locally and preserves package parts around its targeted edits; it cannot reconstruct missing geometry or validate every extension. A repaired archive is not proof of equivalent sliced layers. Reselect the downloaded copy in preflight.',
    next: PublicRouteUrl.ThreeMfPrintPreflight,
    cta: 'Recheck the saved 3MF build',
    guide: PublicRouteUrl.MissingThreeMfObjectsGuide,
    guideLabel: 'Investigate a missing placed object before repair',
  },
  [PublicRouteUrl.StlPrintPreflight]: {
    guide: PublicRouteUrl.StlVolumeWrongGuide,
    guideLabel: 'Investigate unavailable or implausible STL volume',
    heading: 'Known geometry before a collection review',
    example:
      'Run the mixed batch collection to reproduce a closed 20 mm cube (12 triangles, screened 8,000 mm\u00b3 volume), an open-face cube (four boundary edges, volume unavailable), and malformed input. A failed file is distinct from a completed mesh with no findings.',
    interpretation:
      'Separate completed topology checks from sampled wall rays and skipped printer fit. Choose the STL unit explicitly: the same 20-unit fixture interpreted as inches is 508 mm wide. Keep the original unchanged and check a repaired copy separately.',
    next: PublicRouteUrl.BatchStlChecker,
    cta: 'Review more files consistently',
  },
  [PublicRouteUrl.ThreeMfPrintPreflight]: {
    guide: PublicRouteUrl.MissingThreeMfObjectsGuide,
    guideLabel: 'Trace missing 3MF parts and placements',
    heading: 'Interpret the resolved 3MF build',
    example:
      'A mesh-based 3MF can declare physical units and place build items with transforms. Review the resolved dimensions, not just one object in the archive. Missing explicit units use the format default; unsupported package behaviour must stay unresolved rather than receive a clean badge.',
    interpretation:
      'A two-item build can contain legitimate disconnected parts. Shared topology and volume interpretation need care: multiple shells do not automatically establish a single solid. Fit uses the selected nominal printer box and does not validate slicer reservations, embedded profiles or supports.',
    next: PublicRouteUrl.BatchStlChecker,
    cta: 'Check supported 3MF collections',
  },
  [PublicRouteUrl.DimensionsChecker]: {
    guide: '/how-to-check-if-a-3d-model-fits-your-printer',
    guideLabel: 'Check brims, excluded areas and placement after nominal fit',
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
    heading: 'Carry the production job total into the quote',
    example:
      'Fictional five-part, two-plate job: production cost is 39.192 currency units, including shared order work once. At a 30% margin the order price is 55.99 without fees. Adding a 5% fee on the full selling price gives 39.192 / (1 - 0.30 - 0.05) = 60.30. No fixed fee, minimum, tax or shipping is included.',
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
      @if (item.guide) {
        <p>
          <a [href]="item.guide">{{ item.guideLabel }}</a>
        </p>
      }
      <p>{{ item.example }}</p>
      <h3>Interpret the result and choose the next step</h3>
      <p>{{ item.interpretation }}</p>
      <a [href]="item.next" (click)="track()">{{ item.cta }}</a>
      <p>
        <a [href]="exampleAsset.Closed20mmCubeStl" download
          >Download the owned 20 mm cube sample</a
        >, or
        <a [href]="exampleAsset.DeclaredInchTransformed3mf" download
          >the declared-inch 3MF sample</a
        >. For a G-code preview, use the
        <a [href]="exampleAsset.ThinArachneGcode" download
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
  readonly exampleAsset = ExampleAsset;
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
