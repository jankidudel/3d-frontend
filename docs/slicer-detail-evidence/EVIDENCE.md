# Orthogonal lettering and shell controls

These original source models isolate material strokes, recessed paths, relief,
source cavities and branching cross-sections. Their geometry is independently
verified. Actual PrusaSlicer 2.9.6 CLI runs now accompany them, with exact
profiles, output bytes, hashes and bounded path observations. No physical print
or native GUI screenshot is claimed. Published assets are the canonical retained copies. `publish-assets.py`
rebuilds the figures from those files, and regression checks verify their hashes.

## Reproduce the exact inputs

From `3d-frontend`, run:

```sh
python3 docs/slicer-detail-evidence/generate-controls.py
python3 docs/slicer-detail-evidence/verify-controls.py
```

Both scripts use only the Python standard library. The generator is
deterministic. `inputs.json` identifies serialized bytes by SHA-256 and records
source boxes, subtracted boxes, glyph regions and coordinate conventions.
`geometry-observations.json` is written only after independent bounds, volume
and topology assertions pass. The verification also exercises named material
and void points, including the O counter, the H crossbar, the recess bottom,
the vessel base and both sides of the branch. Separate negative controls reject
a missing triangle and reversed winding, and a hand-specified ray case checks
the point-in-solid calculation. This does not test a G-code extractor.

All coordinates assume millimetres, +Z up. STL does not declare a physical unit.
The lower plaque corner is at the origin. The original inputs have no centering translation. Slicer exports
are centred at X=100, Y=100; the path records retain the resulting source-to-output offsets. Float32 serialization accounts for small differences between
analytic dimensions and reopened values.

## Source geometry

| Control | Designed envelope, mm | Analytic material volume, mm³ | Independent variable                                                         |
| ------- | --------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| T1      | 40 x 24 x 2.6         | 1938.867                      | O/H/I strokes 0.25 / 0.45 / 0.80 mm; 0.60 mm relief                          |
| T2      | 40 x 24 x 2.6         | 1955.136                      | O/H strokes locally widened to 0.80 mm; plaque and glyph locations unchanged |
| T3      | 40 x 24 x 2.1         | 1925.856                      | T2 XY outlines; 0.10 mm relief                                               |
| T4      | 40 x 24 x 2           | 1901.133                      | Recessed T1 outlines, known slot widths and 0.60 mm depth                    |
| V1      | 24 x 24 x 30          | 17280                         | Closed solid outside shape                                                   |
| V2      | 24 x 24 x 30          | 3843.072                      | Designed open vessel, 1.2 mm walls and base                                  |
| V3      | 24 x 24 x 30          | 13440                         | Full base below Z=10; two separated upper towers above Z=10                  |
| R-box   | 30 x 30 x 10          | 9000                          | Closed roof control                                                          |

O occupies X=4..10, H X=17..23, and I starts at X=30; all extend
Y=6..18. Original polygon lettering uses no third-party font. The O and H retain
their outside footprint when widened. The O counter remains empty above the
plaque; the H has separated uprights joined by its central crossbar. T4
subtracts the same narrow outlines from Z=1.4..2.0, leaving material under the
recess and an island inside the O attached to that material. R-box is a separate
closure control; reuse V2 for the intended-open-source comparison.

For stroke width w, the O material area is 36w - 4w², the H area is
30w - 2w², and the I area is 12w. Multiply their sum by relief/depth and
add/subtract it from the 1920 mm³ plaque. The vessel volume is
24 x 24 x 30 - 21.6 x 21.6 x 28.8. These analytic values are independent
of mesh tessellation.

## Attachment and geometric limits

The generator classifies cells on a shared rectilinear coordinate grid, then
emits only the boundary between occupied and empty cells. Internal shared
faces are removed, so lettering is joined to the base as one material solid,
rather than delivered as intersecting closed glyph meshes. A shared global
grid avoids T-junctions on adjacent surface patches. Coplanar triangles have
disjoint interiors by construction. This restricted construction and the
independent material/void tests describe intended geometry; zero boundary
edges alone would not establish freedom from self-intersections in an
arbitrary model. The verifier is not a general mesh intersection detector.

All eight reopened controls have one edge-connected shell with no boundary,
over-shared or inconsistently wound edges. An open-top vessel still has a
closed material boundary around its cavity. Orthogonal glyph outlines are
controlled examples, not recommendations for minimum readable text.

## Actual software experiments

The official macOS disk image for PrusaSlicer 2.9.6 has SHA-256
`94fd7b8a9f87c9631e1c71739b15b184fc5f4c0ceabd69072f1c78f229a4fe40`.
The release was downloaded through its official GitHub release page. Finder
opened the disk image; the executable was run directly from the mounted image,
without installing in Applications or connecting to a printer. `run-experiments.py`
records executable identity, exact commands, exit codes, warnings, console
output, hashes and generation times in `prusa-2.9.6/runs.json`. Complete profiles
and the ordinary control outputs are retained once in `public/examples/slicer-detail/`.
All 15 baseline/control runs returned exit code zero. These are inspection
exports, not qualified printer profiles.

To repeat with a supported executable:

```sh
python3 docs/slicer-detail-evidence/run-experiments.py /path/to/prusa-slicer
python3 docs/slicer-detail-evidence/project-comparison.py /path/to/prusa-slicer
PYTHONDONTWRITEBYTECODE=1 python3 docs/slicer-detail-evidence/verify-paths.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/slicer-detail-evidence/inspect-paths.py
INSPECTMESH_REFRESH_SLICER_EVIDENCE=1 npx vitest run scripts/slicer-detail.spec.mts
PYTHONDONTWRITEBYTECODE=1 python3 docs/slicer-detail-evidence/publish-assets.py
```

Canonical storage is deliberately small:

- `public/examples/slicer-detail/` owns the downloadable profiles, source models,
  ordinary G-code exports and observation records. Tests and figure generation
  read these exact files rather than a duplicate evidence tree.
- `prusa-2.9.6/runs.json` owns execution provenance and paths to retained outputs.
  Progress logs are consolidated there instead of separate log files.
- The two unique project-reader G-code exports and the wall-browser observation
  remain private evidence in `prusa-2.9.6/`. The fresh-profile project run has
  byte-identical output to P-roof and references that same retained file.
- Smoke-test output, full CLI help and the intermediate project seed use temporary
  storage. The smoke test retains its exit status, hashes and console record;
  it is setup evidence rather than a downloadable article example.

The reproduction scripts use temporary directories for intermediate files. They
write necessary final assets directly to canonical storage and do not recreate
per-run log files or a second copy of the public downloads. A repeated run can
produce different timestamp comments; newly different project output is retained
separately, with its actual hash and path in the manifest.

The full baseline retains 0.4 mm nozzle, explicit 0.45 mm extrusion widths,
0.20 mm nominal and first layers, Classic, two perimeters, thin-wall detection
off, 15% rectilinear infill, four top and four bottom layers, zero minimum shell
thickness, supports off, spiral off, no adaptive layers, absolute E, 1.75 mm
filament and 1.24 g/cm³ declared density. Printer start/end commands are retained
in the output. Temperatures and declarations are not printer approval.

| Runs         | Deliberate comparison                                                   | Actual bounded observation                                                                           |
| ------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| T1-C / T1-A  | Same STL, Classic / Arachne                                             | O-region positive moves above the plaque: 0 / 24                                                     |
| T1-C / T2-C  | Original / locally widened O and H, same Classic profile                | O-region moves: 0 / 27; plaque and glyph outside footprint fixed                                     |
| T2-C / T3-C  | Same XY, 0.60 / 0.10 mm relief                                          | Raised paths present / absent above Z=2                                                              |
| T3-C / T3-F  | 0.20 / 0.10 mm nominal and first layers                                 | No raised paths / paths at Z=2.1                                                                     |
| T4-C         | Recess interval Z=1.4..2.0                                              | Tested groove strips have no crossings at deposition Z=1.6,1.8,2.0; O-counter material retains paths |
| V1-N / V1-S  | Ordinary / spiral profile                                               | Roof at Z=30 / continuously rising upper extrusion and no roof                                       |
| V2-N / V2-S  | Designed vessel, ordinary / spiral                                      | Cavity floor at Z=1.2 / successful export with the same parsed coordinate paths as V1-S              |
| V3-S         | Two separated upper towers, spiral attempt                              | Successful export; only right-tower path bounds above Z=20                                           |
| R1 / R2 / R3 | Same box; top count 4 / 0 / restored 4, minimum thickness fixed at zero | 193 top-solid moves at Z=10 / no top-solid category / 193 restored                                   |

`inspect-paths.py` rejects unsupported motion/state commands and malformed input,
tracks XYZ/E modes, G92, homing invalidation and retraction debt, and uses full
segment/region intersections. Nine independent small tests exercise this
reader. Region presence does not establish complete glyph tracing, deposited
plastic outlines or physical readability. Source translation is removed only
for the five path-derived SVG figures; they are explicitly not native screenshots.
R1 and R3 declare 4.35 g, 1460.02 mm filament, 22m 1s; R2 declares 3.59 g,
1205.33 mm and 16m 9s. The difference is planned output with a missing required
roof, not a validated material saving.

## Project and production implementation comparisons

`project-comparison.py` uses the official CLI geometry export as a seed, then
constructs two controlled Prusa-format archives containing the same geometry,
full baseline profile and object-level `top_solid_layers` 4 or 0. These packages
are scripted fixtures, not GUI Save Project results. Actual CLI reopening and
slicing produces roof/no-roof. The official geometry-only STL export of P-open
is sliced with the fresh baseline and regains its roof. The source and derivative
triangle records match after the recorded +[85,85,0] mm placement translation,
including winding/cyclic order. Counts and bounds alone are not used as proof.

`scripts/slicer-detail.spec.mts` executes current production implementations.
Both projects resolve as complete supported geometry, one build item/mesh,
12 triangles and 9,000 mm³ supported volume. The resolver does not apply the
Prusa object preparation overrides. T1 has 500 measured, zero unmeasured wall
samples and 32 below the illustrative 0.4 mm threshold; T2 has the same measured
count and none below it. Named O-side samples record the local result separately
from longer rays through the plaque.

The exact representative G-code files are also reviewed by the current
production parser. Linear and extrusion coverage are incomplete; duration and
material declarations are recognised; the retained previews are not truncated.
Unsupported G28/M84 effects are disclosed rather than removed from the exports.
`browser-review-R1.json` was downloaded from the production browser tool on
1 November 2026 after loading the exact public R1 bytes. Its SHA-256 matches the
retained export, all 4,796 lines are reviewed and the per-metric states agree
with the implementation observations. No G-code was executed on a printer.

`viewer-observations.json` records actual production viewer clipping for V2 at
Z 3%,5%,7% (0.90,1.50,2.10 mm) and T4 at 69%,75%,95% (1.38,1.50,1.90 mm),
with unit assumption, hashes, axis, camera operations, retained side and visible
surfaces. Clipping remains uncapped; the observations do not measure a section.

## Exact remaining native UI limitation

During the recorded attempt the official mounted app was running, but the
supported native UI connector could not bind it. `cua.listApps()` identifies `com.prusa3d.slic3r.`, while the official
Info.plist bundle identifier is literally `com.prusa3d.slic3r/`; binding by name,
path and identifiers returns Invalid app or Running application not found.
The signed bundle and system protections were not modified. Therefore the
same-output native visibility before/after demonstration, native object-tree
inspection and GUI Save Project/reopen recording remain unperformed. CLI
project-reader evidence is labelled accordingly and does not establish native
GUI display state or cross-slicer portability. Earlier retained examples remain
separate evidence, and none of these software observations is physical testing.
