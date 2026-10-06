# Evidence record - 4 October 2026

This is retained technical research supporting InspectMesh's tools and examples. It records historical observations, not current deployment status or instructions for a new batch. Preserve the dated evidence and its companion fixtures, screenshots and benchmark data.

All model fixtures are owned mathematical geometry. Inputs describing filament weights, costs, load cases and temperature exposure are illustrative. No physical prints, product performance tests or invented review author credentials are claimed.

## Geometry controls

- Closed 20 mm cube: 12 triangles, 8,000 mm³ screened volume and no boundary edges.
- Same cube missing one face: 10 triangles, four boundary edges; volume unavailable. Malformed text fails independently in the mixed queue.
- Deliberate STL inch assumption: 20 units becomes 508 mm. The explicitly declared one-inch 3MF cube resolves to 25.4 mm. Its build-item translation is two inches on X; the resolver applies the transform and normalises millimetres before analysis.
- Changed cube: 20 to 24 mm width, unchanged other axes, 4 mm sampled maximum in the original frame. 5,000 area-distributed point-to-triangle queries in each direction. Unchanged retriangulation control: zero displayed deviation with different file bytes. These are sampled measurements, not a whole-surface upper bound.
- Duplicate, degenerate, non-manifold and disconnected-shell fixtures exercise known findings in the tests. Closed-shell volume is deliberately unavailable when orientation or shell interpretation does not pass the conservative screen. Self intersections remain unchecked.
- Fit fixture: 250 × 210 × 180 mm. A1 Mini nominal 180 mm cube fails every right-angle permutation. A1/P1S nominal 256 mm cube fits geometrically. MK4S 250 × 210 × 220 mm is at its nominal X/Y boundary. Brims, excluded bed areas and real helmet fit are separate checks.

## Actual slicer software experiments

Official PrusaSlicer 2.9.6 macOS release was downloaded from the vendor's GitHub release and run from a temporary read-only mounted disk image. No printer was controlled. Exact G-code exports are retained in `fixtures/`; replay buttons use copies of the thin-wall exports under public examples.

Thin-wall input: three separate 20 mm long, 10 mm high bars, widths 0.3, 0.45 and 0.9 mm, X offsets 0/10/20 mm. Recreate with `fixtures/generate-fixtures.py` from the frontend root.

```sh
PrusaSlicer --export-gcode --perimeter-generator classic --nozzle-diameter 0.4 --layer-height 0.2 --extrusion-width 0.45 --perimeters 2 --fill-density 0 --no-thin-walls --output thin-classic.gcode thin-wall-bars.stl
PrusaSlicer --export-gcode --perimeter-generator arachne --nozzle-diameter 0.4 --layer-height 0.2 --extrusion-width 0.45 --perimeters 2 --fill-density 0 --no-thin-walls --output thin-arachne.gcode thin-wall-bars.stl
```

Other settings were CLI defaults, retained in the exported configuration footer. The exports are inspection fixtures, not validated printer profiles. Do not send them to a printer.

| Export  | Declared filament length | Slicer estimate | Actual parsed second-layer preview                |
| ------- | ------------------------ | --------------- | ------------------------------------------------- |
| Classic | 83.41 mm                 | 3m 32s          | Four extrusion moves, one closed narrow outline   |
| Arachne | 142.10 mm                | 5m 28s          | Six extrusion moves, paths at three bar positions |

Both runs warned about low bed adhesion. Classic also warned about loose extrusions. The longer job is not automatically a better or successful physical print. CLI density was zero, so reported mass is not usable. The current G-code viewer does not parse this export's filament-length footer; the length values above were read directly from the original slicer export. It displays supported duration comments, 50 parsed layers and explicit unsupported firmware-command limitations.

Nozzle control: owned 20 mm cube; same layer height 0.2 mm, explicit width 0.45 mm and perimeter speed 45 mm/s. Diameter-only switch 0.4 to 0.6 mm gave estimates 23m 49s and 23m 45s. First-layer width remained a 200% profile setting, so not every extrusion setting was geometrically identical. This demonstrates why a diameter-field change alone supplies no general speedup ratio. Complete exports preserve the settings; no real printer timing is asserted.

## Processing budgets

`node-benchmarks.json` records actual Node v24.19.0 observations on this macOS arm64 computer for 1,200, 12,000 and 99,996 triangles. At 99,996 triangles the process RSS rose from approximately 105 MB to 216 MB; these are Node process measurements, not browser heap measurements. The check took approximately 341 ms and same-surface comparison approximately 135 ms in that run.

The actual browser queue processed the 99,996-triangle disjoint-cube fixture (21 mm spacing; Node used 25 mm spacing) in 323 ms, with 8,333 shells and 2,000 wall samples. Screenshot: `screenshots/budget-mobile.jpg`. Browser heap instrumentation and low-memory mobile hardware were not measured. A phone-sized viewport is layout validation on this computer, not a physical-phone benchmark.

Limits are intentionally conservative: 5 MiB input, 100,000 resolved triangles, 20 MiB declared expanded 3MF package and sequential collection processing. Worker termination cancels active checks. The free collection allowance is three; development preview allows twenty with identical per-file budgets. These observations support the current bounded workflow, not universal support for arbitrary models or a guarantee of latency.

## Browser and numerical checks

Actual browser results were inspected for the mixed queue, declared-inch 3MF, large-triangle fixture, changed and retriangulated comparison, spool, nozzle/wall, volumetric and finish planners, and the two real slicer exports. Mobile spool and batch pages had equal document content/viewport widths at 375 CSS pixels. Tests cover London DST gaps and repeated times, Sydney, multi-day duration, reserve and whole-copy arithmetic, invalid inputs, geometric controls, CSV formula quoting, worker cancellation, report schema/local storage, environment allowance and analytics consent.

The final comparison screenshot includes screened volumes of 8,000 and 9,600 mm³ for the known widened cube. The unchanged retriangulation control displayed 8,000 mm³ on both sides and zero displayed sampled maximum/mean/over-tolerance count. The flow screenshot shows 9 mm³/s requested throughput and 133.33 mm/s at an explicitly entered 12 mm³/s limit. The finish screenshot shows a 400-minute elapsed plan in Europe/London. Every one of the six new tools has a working-result screenshot; these are local development browser observations.

The in-app browser's native download observation timed out after clicking Export JSON. The report schema and CSV escaping are tested; a downloaded OS file was not captured through that browser interface. No successful file-download capture is claimed.

## Research boundary

All 120 supplied seeds have one primary owner in `keyword-ownership.json`; all 25 topic briefs have an outcome in `topic-brief-outcomes.json`. No Keyword Planner export, GSC queries/countries/impressions, conversion attribution or affiliate programme credentials were supplied. Those values are unknown, not zero. Discovery settings remain Google Search, English, UK/US/CA/AU/NZ/IE, latest available 12-month history requested. No geography-controlled top-ten ranking study, CPC-derived conversion forecast or organic-difficulty claim is made.

A dated general search sample found LayerCalc's spool page with editable mass, tare, density, job usage and optional geometric estimation. InspectMesh's contribution is an explicit reserve and complete-copy result without unsourced brand tare presets. Meshdiff and diff.tools advertise spatial comparison; their advertised functions were not interactively verified. InspectMesh documents the finite surface sampling, unchanged retriangulation control and coordinate policy. These observations show competing intent, not easy keywords or country rankings.

Sources: [LayerCalc](https://layercalc.com/filament-remaining-calculator/), [Meshdiff advertised features](https://meshdiff.com/features/), [diff.tools advertised model comparison](https://www.diff.tools/model-compare). Technical facts come from first-party documentation linked on the respective pages, including Prusa, SUNLU, Bambu and MDN. Manufacturer referral links have no configured affiliate commission. Product availability and shipping are not inferred from a locale URL.

## Reproducing the retained controls

From the frontend root, run `python3 docs/english-market-batch/fixtures/generate-fixtures.py` to recreate the owned model controls. The slicer commands and retained settings are documented above.

For Node observations, bundle the two TypeScript modules with the existing esbuild dependency and pass their absolute output paths to `fixtures/benchmark-node.mjs`, followed by an output JSON path. Preserve the original dated report; record each new run with its own device/runtime context rather than silently replacing historical evidence.
