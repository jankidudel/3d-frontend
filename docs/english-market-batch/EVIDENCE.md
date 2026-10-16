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

## Additional collection controls - 7 October 2026

The new controls under `public/examples/collection-review/` are original mathematical geometry, reproduced with `python3 scripts/generate-collection-examples.py`. Reproduce the two derivative coupon STLs with `node --experimental-strip-types scripts/generate-collection-reductions.mts`. They are software controls, not physical-print or assembly evidence. `npm run test:collection-examples` reads the distributed files and verifies their findings, including exact derivative bytes.

- One reusable 20 mm cube resource placed once resolves to a 20 mm cube. The same resource placed twice at X=0 and X=40 resolves to 60 × 20 × 20 mm and two disjoint shells. Multiple-shell volume is unavailable in collection review.
- Two 20 mm closed STL cubes, the second translated 10 mm on X, overlap in space while their connectivity remains separate: two shells, 30 × 20 × 20 mm bounds, zero boundary edges and zero over-shared edges. This demonstrates the limits of edge incidence. No self-intersection detector is implemented or implied.
- The 24-triangle ridge coupon consists of a 40 × 20 × 10 mm block and a separate touching 16 × 0.6 × 0.5 mm ridge. With meshoptimizer 1.2.0, relative error 0.01 and LockBorder, a 75% target gives 18 triangles and a 50% target gives 16. Export/re-import retains 40 × 20 × 10.5 mm bounds for both. The latter has two exact duplicate triangles and one non-manifold edge. Neither output is certified as equivalent or printable. The target count is a request, not a guarantee.
- The original declared-inch package is checked under both STL selector values: the one-inch cube still resolves to 25.4 mm per side and X=50.8 to 76.2 mm. Its package units and translation are independent of the STL assumption.
- Report thumbnails use a fixed orthographic projection and at most 750 sampled triangle outlines on a 256 × 180 canvas. They are bounded previews, not measurements or complete geometric renderings. JSON and optional browser history can include this preview, labels and findings; original file bytes and 3D geometry arrays are not serialised.

The 3MF Core Specification (resources, build items, units, transforms and mesh conditions), meshoptimizer documentation and Prusa's limited-repair documentation were consulted on 7 October 2026. No new slicer-repair experiment was performed. The automatic-repair guide explicitly distinguishes a mathematical missing-face reconstruction example from unobserved application behaviour.

## CAD export example method - 8 October 2026

The assets in `public/examples/cad-export/` are original mathematical examples, not CAD screenshots or physical measurements. The reference binary STL is `public/examples/english-market-batch/closed-20mm-cube.stl`: 12 consistently oriented facets, 20 mm spans and 8,000 mm³ enclosed volume under a millimetre assumption.

To reproduce `duplicate-face-cube.stl`, retain the reference header and facets, change the little-endian triangle count at byte 80 to 13, then append an exact copy of the first 50-byte facet record. Expected length: 734 bytes. For the companion 3MF, deduplicate facet coordinates into a vertex list, retain the same 13 indexed triangles, declare `millimeter`, and include one identity-transformed mesh object in the build. Use a relationship-selected model part and standard 3MF content types. ZIP timestamps and compression layout are not geometric evidence.

`npm run test:collection-examples` exercises actual local 3MF cleanup: duplicate removal changes 13 triangles to 12, with zero open edges. It also checks the shared 3MF-to-STL exporter with the declared-inch transformed cube: 25.4 mm spans, X coordinates from 50.8 to 76.2 mm and approximately 16,387.064 mm³. Coordinates must resolve to physical millimetres before writing unitless STL.

The circular diagram uses `s = R × (1 - cos(π/N))` for N equal circle segments. R = 10 mm gives approximately 0.08555 mm at N = 24 and 0.00952 mm at N = 72. This cross-section arithmetic is not an exporter-wide or printed tolerance. The splitting diagram describes a mid-height cut of a 20 mm cube, giving two expected 10 mm spans; supported capping and output validation still require the actual splitter.

### Spreadsheet report policy

CSV quotes cells, doubles embedded quotes and preserves embedded line breaks. An untrusted string whose first non-whitespace/non-ASCII-control character is `=`, `+`, `-` or `@` receives an apostrophe before the entire cell. That prefix deliberately keeps formula-like labels as data for Excel/LibreOffice import. Retain it and import labels as text rather than stripping it or evaluating the expression. Typed numeric measurements are separate from untrusted labels. Nonfinite numbers are rejected by the CSV cell serializer and collection JSON serializer. Filenames and project references are not analytics parameters.

## Visual diagnosis controls - 10 October 2026

The shared public registry is `src/app/features/examples/example-registry.ts`. The gallery owns download/discovery summaries, guides own interpretation, and tools own execution. Models remain original mathematical geometry; no physical print success or newly reproduced native slicer run is claimed.

Reproduce the additional bounded winding/stored-normal, separated-cube and malformed controls with `python3 scripts/generate-diagnosis-controls.py`. Reproduce the original static projections with `python3 scripts/generate-diagnosis-previews.py`. Existing collection and initial geometry generators remain authoritative for their assets. `npm run test:collection-examples` reads the actual distributed bytes, checks independent counts/dimensions, executes local checks and conversion, and reopens written STL output.

On Node v24.19.0, current local preflight independently reports one duplicate and three over-shared edges for the 13-facet control; three directed-edge conflicts for a single reversed triangle; zero conflicts when only one stored STL normal vector changes. Correcting the controlled triangle back and reopening its binary export restores zero conflicts and 8,000 mm³ under millimetres. This is a deliberate mathematical correction, not a recorded server repair. Preflight now withholds volume for detected winding conflicts and multiple components, matching the conservative collection screen. Neither method detects self intersections or establishes the intended outside.

The actual original/75% coupon comparison at 0.1 mm tolerance and 5,000 samples per direction gives maximum sampled distance 0.2329025659 mm, mean 0.00051183744 mm and 25 samples above tolerance. This is finite sampling, not a global bound. The actual thin-bar screen at 1.2 mm gives 36 measured rays, zero unmeasured and 12 below threshold, minimum approximately 0.299990 mm; centroid rays in other directions see the longer spans. No-hit rays on other inputs must remain distinct from zero thickness.

The custom X/Y/Z envelope control compares 250 × 210 × 180 mm with 220 × 260 × 200 mm. Swapping X/Y yields 210 × 250 × 180 mm. Hypothetical 5 mm allowances on each X/Y side reach exactly 220 × 260 × 180; 6 mm yields 222 × 262 × 180 and fails. These allowances are independent arithmetic, not an automatic preflight feature, general collision detector or support strategy.

The current screenshots under `public/examples/diagnosis/slicer-*.jpg` are actual local parsed second-layer previews of the exact retained PrusaSlicer 2.9.6 exports, with travel paths hidden. They show four Classic and six Arachne extrusion moves at Z=0.55 mm. The parser preview is not native slicer execution or firmware simulation. The historical commands, versions, configuration footers and physical-test exclusions above remain the experiment record.

## Disconnected-piece shortcut verification - 14 October 2026

The existing generated binary fixture `public/examples/floating-parts/cube-plus-two-fragments-binary.stl` contains 20 triangles in three edge-connected pieces. The largest-area piece is the 12-triangle cube. In the local production build, pressing Keep largest part proposed one kept piece and 12 retained triangles without starting a download. The explicit browser download was 684 bytes (`84 + 50 × 12`); reparsing its 12 triangle records showed X, Y and Z bounds of 0 to 20 and exact face-coordinate/winding equality with `public/examples/english-market-batch/closed-20mm-cube.stl`. This verifies the local selection-only operation for this control, not standard server cleanup or a physical print. STL stores no unit; the displayed millimetres are an example assumption.

The component tests additionally cover close-area confirmation, deterministic area/triangle-count/ID ranking, reset, zero-retained download guard, cancellation and stale worker responses. The similarly sized two-cube control is a generated intended-parts counterexample. Neither a large surface area nor a warning establishes which pieces a user may discard.

## Slicer diagnosis controls - 14 October 2026

The eight original binary STLs under `public/examples/slicer-diagnosis/` are reproducible with `python3 docs/english-market-batch/fixtures/generate-slicer-diagnosis.py`. They assume millimetres, which STL does not declare. The independent expected bounds, triangle counts and component counts are asserted against the published bytes in `scripts/collection-examples.spec.mts`; all generated triangle edges occur twice with opposing winding. `render-slicer-diagnosis.py` reads the retained G-code to draw the public layer SVGs. These are actual parsed extrusion paths, not native slicer screenshots or firmware simulation.

PrusaSlicer 2.9.6 was run from the official macOS DMG (`https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.9.6/PrusaSlicer-2.9.6.dmg`, SHA-256 `94fd7b8a9f87c9631e1c71739b15b184fc5f4c0ceabd69072f1c78f229a4fe40`). The CLI used its default 200 × 200 mm bed and no named printer preset. Every successful run specified a 0.4 mm nozzle, 0.45 mm extrusion width, 0.2 mm layer and first-layer height, and two perimeters. All runs except the placement failure used `--center 100,100`. The exact G-code, configuration footers and the support and placement CLI logs are retained in `docs/english-market-batch/fixtures/slicer-diagnosis/`. Selected G-code copies are public downloads. No printer, material sample or physical print was tested.

- **Floating region:** The one-component closed integral arm has 20 triangles, spans X=0..30, Y=0..10, Z=0..20 and starts its overhang at Z=10. The no-support CLI log reports `Floating bridge anchors, Loose extrusions, Long bridging extrusions`. With 15% infill, the Z=5.2 mm layer has zero support-material extrusion moves without support and 20 with `--support-material --support-material-auto`. The support run does not prove print success. The detached tetrahedron and two intended cubes are separate-component controls (16 and 24 triangles respectively), demonstrating why source connectivity alone cannot classify a slicer warning.
- **Off-bed model:** The shifted cube has X=230..250, Y=20..40, Z=-5..15, while the origin control has X/Y/Z=0..20. Each is 684 bytes with 12 triangles and 20-unit spans. With `--dont-arrange` on the shifted cube, PrusaSlicer reported `All objects are outside of the print volume.` and produced no G-code. Under `--center 100,100`, the two outputs were byte-identical (SHA-256 `087948520f41498c22c8012713de8186e6fe8306a16fe8eaa5b7b34927bc7427`). This tests one placement operation; it does not imply every slicer imports every shifted STL the same way. Both successful runs used 100% rectilinear infill.
- **Channel filled by source geometry:** The closed through-channel is a 20 × 20 × 10 outer box with a 6 × 6 passage, 32 triangles, one connected shell and zero open edges. The solid capped control has 12 triangles; the overlapping control adds an 8 × 8 × 10 cube to the through-channel, giving 44 triangles and two connected shells. Both also have zero open edges. With 100% rectilinear infill, a geometric point-to-segment check on positive-extrusion first-layer moves finds zero within 1 mm of X/Y=100 for the open passage, versus six each for the capped and overlapping controls. The capped and overlapping G-code exports were byte-identical (SHA-256 `59153f4728ac5cc5ea0a24e1222c1985483bb31ae348e1737c063afb6239fe6f`). The open passage also has zero centre crossings at Z=5.2 mm. This is one deliberately large passage under one profile, not a universal minimum hole-size result.

To repeat the support contrast after generating the STL, run `PrusaSlicer --export-gcode --center 100,100 --nozzle-diameter 0.4 --layer-height 0.2 --first-layer-height 0.2 --extrusion-width 0.45 --perimeters 2 --fill-density 15% --output OUTPUT.gcode integral-overhang.stl`, then repeat with `--support-material --support-material-auto`. For the placement and channel controls, use `--fill-pattern rectilinear --fill-density 100%` with the same geometry settings. Use `--dont-arrange` without `--center` for the shifted-source failure control. Keep each output path distinct; CLI output can include run timestamps. `npm run test:collection-examples` recalculates the public file bounds and the retained layer-path findings instead of trusting the guide copy.

## Wall-screen controls checked 16 October 2026

The local wall method in `src/app/features/shared/wall-thickness/wall-thickness-analysis.ts` (baseline source commit `9d615c7`; method unchanged in this batch) selects at most 2,000 faces evenly through input triangle order. Each selected face contributes one centroid ray along the inward face normal, starting 0.00001 source coordinate units inward. The BVH first hit must be farther than that offset and finite. There is no explicit maximum ray distance. Degenerate selected faces and absent accepted hits are unmeasured; triangles outside the finite selection are unsampled. The report computes the smallest and mean measured sample, counts below the review threshold with a strict less-than comparison, and records measured + unmeasured = attempted. The heatmap does not distinguish an unmeasured selected face from an unsampled face by colour. This method is a combined-scene screen: rays can hit another component, and the report does not retain hit-body identity. It is synchronous on the UI thread after a scheduled yield, with no worker or cancellation; tool-page revision guards discard earlier results when inputs change.

STL coordinates enter the ray calculation unchanged. The user's selected STL coordinate unit labels those coordinates, threshold and displayed distances. An inch interpretation makes a one-unit distance physically 25.4 mm; it does not rescale the numeric ray result. 3MF resolution applies declared units, nested transforms and every supported placed build item before storing Float32 millimetres. The 3MF wall threshold and result are mm. Required or recommended unsupported extensions, unsafe packages and unresolved geometry stop with an error; optional materials/project settings are outside this geometry check.

The three closed thin bars in `public/examples/english-market-batch/thin-wall-bars.stl` at mm and 1.2 mm review threshold returned 36 attempted, 36 measured, 12 below, 0 unmeasured and a smallest ray distance of about 0.29999 mm. The closed 20-coordinate cube is a broad scale control. The open-face cube at the same mm/1.2 mm settings returned 10 attempted, eight measured, two unmeasured, zero below threshold and a smallest measured sample of about 20 mm. It is a no-hit direction control, not a claim that every ray misses.

The new fixture `public/examples/wall-controls/two-scale-slabs.3mf` is generated by `python3 scripts/generate-collection-examples.py`. It is one consistently wound, closed 0.8 × 10 × 10 mm resource placed once at identity and once at uniform 0.5 scale with X translation 30 mm after scaling. The resolver returned two placed meshes, 24 combined triangles, bounds X 0 to about 0.8 mm and 30 to about 30.4 mm, and no overlap. At a 0.6 mm review threshold, the current local ray code returned 24 attempted, 24 measured, four below, zero unmeasured and a smallest measured sample about 0.39999 mm. The deviation from 0.4 mm reflects Float32 storage and the ray-origin offset, not metrology accuracy. Reproduce the two-scale observation with `npx vitest run scripts/collection-examples.spec.mts -t 'resolves both placed wall scales'`. No physical print was tested.
