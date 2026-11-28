import { GuideRouteUrl } from '../../core/seo/guide-routes';
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
      'Our example cube with one duplicate triangle has 13 faces. Removing that duplicate should restore 12 without inventing a surface. A missing whole cube face is a different problem: cleanup cannot recreate its intended design.',
    interpretation:
      'Standard STL cleanup explicitly uploads your selected file, up to the current 25 MiB guest limit, for server processing. Disconnected-piece detection and selection-only export run locally and never silently combine with that action. STL has no declared unit. Review the actual removal counts and skipped reasons, download the separate copy, then reselect it for preflight and revision comparison. No unconditional printability claim is made.',
    next: PublicRouteUrl.StlCompare,
    cta: 'Compare input and cleaned STL surfaces',
    guide: GuideRouteUrl.RouteHowToRepairAnStlFile,
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
    heading: 'Reading a 3MF build',
    example:
      'A 3MF states its unit and places each object at a position and scale. Check the size of the whole build as placed, not just one object in the file. If no unit is given, millimetres are used; features InspectMesh cannot read are reported as unchecked, never as passed.',
    interpretation:
      'A build with two objects can be two perfectly good separate parts. Several separate pieces do not make one solid, which affects volume. The printer fit uses the listed build volume of the printer and does not account for slicer no-print areas, saved profiles or supports.',
    next: PublicRouteUrl.BatchStlChecker,
    cta: 'Check several 3MF files together',
  },
  [PublicRouteUrl.DimensionsChecker]: {
    guide: GuideRouteUrl.RouteHowToCheckIfA3dModelFitsYourPrinter,
    guideLabel:
      'Will a model fit your printer? Brims, no-print areas and placement',
    heading: 'Worked example: a unit mix-up and a printer fit',
    example:
      'A part drawn 2 inches wide is 50.8 mm, not 2 mm. Check one dimension you know before multiplying by 25.4. Likewise, our 20 mm example cube reads as 508 mm if you choose inches, even though the file itself is unchanged.',
    interpretation:
      'A 250 \u00d7 210 \u00d7 180 mm box does not fit a 180 mm cube printer, however you turn it. It does fit a 256 mm cube printer, but with only 6 mm to spare on one side, leaving little room for a brim or no-print areas. Check the real bed in your slicer before printing.',
    next: PublicRouteUrl.PrinterFitChecker,
    cta: 'Check this model against specific printers',
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
    heading: 'Worked example: checking printer fit without rescaling',
    example:
      'A 250 \u00d7 210 \u00d7 180 mm box does not fit the 180 \u00d7 180 \u00d7 180 mm A1 Mini, but fits the A1 (256 mm cube). A 200 \u00d7 100 \u00d7 50 mm box fits a 180 \u00d7 180 \u00d7 250 mm printer only when stood on end, with the 200 mm side upright.',
    interpretation:
      'These checks compare boxes. Fitting the listed volume does not guarantee room for a brim, sensible supports, or that a wearable part like a helmet will fit a person. Check the footprint in your slicer, and only split or scale the model if the new size and joints are acceptable.',
    next: PublicRouteUrl.BatchStlChecker,
    cta: 'Record printer fit consistently across a collection',
  },
  [PublicRouteUrl.OrientationPlanner]: {
    heading: 'Recheck filament and fit after changing orientation',
    example:
      'A 200 \u00d7 100 \u00d7 50 mm box is too wide to lie flat on a 180 \u00d7 180 \u00d7 250 mm printer, but fits when stood on end with the 200 mm side upright. That also means less contact with the bed, different supports, layers running the other way and a different print time.',
    interpretation:
      'Compare the sliced layers, supports and total filament before deciding. Fitting the printer does not guarantee strength or a good print. Use the new slicer estimate in the spool planner, not the figure from a different orientation.',
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
      <h3>What the result means and what to do next</h3>
      <p>{{ item.interpretation }}</p>
      <a [href]="item.next" (click)="track()">{{ item.cta }}</a>
      @if (samples[page()]; as files) {
        <ul>
          @for (file of files; track file.href) {
            <li>
              <a [href]="file.href" download>{{ file.label }}</a>
            </li>
          }
        </ul>
      }
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
  readonly samples: Readonly<
    Record<string, readonly { href: string; label: string }[]>
  > = {
    [PublicRouteUrl.Viewer]: [
      {
        href: '/examples/quality-evidence/keyed-cylinder-100.stl',
        label: 'Example curved part for measuring (STL; open as mm)',
      },
    ],
    [PublicRouteUrl.StlRepair]: [
      {
        href: ExampleAsset.DuplicateFaceCubeStl,
        label: 'Example cube with a duplicate face (STL)',
      },
    ],
    [PublicRouteUrl.ThreeMfRepair]: [
      {
        href: ExampleAsset.DuplicateFaceCube3mf,
        label: 'Example cube with a duplicate face (3MF)',
      },
    ],
    [PublicRouteUrl.StlPrintPreflight]: [
      {
        href: ExampleAsset.Closed20mmCubeStl,
        label: 'Closed 20 mm example cube (STL; open as mm)',
      },
      {
        href: ExampleAsset.OpenFaceCubeStl,
        label: 'The same cube with one side missing',
      },
    ],
    [PublicRouteUrl.ThreeMfPrintPreflight]: [
      {
        href: ExampleAsset.TwoPlacedCubes3mf,
        label: 'One cube placed twice (3MF)',
      },
    ],
    [PublicRouteUrl.DimensionsChecker]: [
      {
        href: ExampleAsset.EnglishMarketBatchPrinterFit250x210x180Stl,
        label: 'Example 250 x 210 x 180 box for printer fit (STL; open as mm)',
      },
    ],
    [PublicRouteUrl.PrinterFitChecker]: [
      {
        href: ExampleAsset.EnglishMarketBatchPrinterFit250x210x180Stl,
        label: 'Example 250 x 210 x 180 box for printer fit',
      },
    ],
    [PublicRouteUrl.GcodePreflightChecker]: [
      {
        href: ExampleAsset.ThinArachneGcode,
        label:
          'Retained Arachne slicer export: inspect only, never run on a printer',
      },
    ],
    [PublicRouteUrl.OrientationPlanner]: [
      {
        href: ExampleAsset.TiltedAsymmetricBlockStl,
        label: 'Example lopsided part for orientation (STL)',
      },
    ],
  };
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
