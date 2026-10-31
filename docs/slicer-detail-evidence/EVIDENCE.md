# Orthogonal lettering and shell controls

These original source models isolate material strokes, recessed paths, relief,
source cavities and branching cross-sections. They are geometry evidence only.
No slicer has been run on these files. They have no observed toolpaths, native
preview screenshots, effective slicer profile or physical print results. They
are kept outside the public example registry and published assets until the
corresponding software observations are available.

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
The lower plaque corner is at the origin. No centering or slicing translation
has been applied. Float32 serialization accounts for small differences between
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

## Software evidence boundary

Required comparisons are T1 Classic/Arachne, T1/T2 with one unchanged profile,
T2/T3 with one layer schedule, T3 with a finer schedule, and T4 through its full
recess interval. Mode observations need V1 ordinary/spiral, V2 ordinary/spiral
and V3's actual spiral attempt. Roof observations need unchanged R-box bytes
with top closure enabled/disabled/restored, plus V2 in ordinary mode. A native
same-output visibility demonstration is a separate display observation.

Retain the actual executable identity, version, commands, effective settings,
warnings, exit codes, output bytes and hashes before recording any conclusion.
The first-layer height, adaptive-layer state and actual deposition heights
matter. The nominal relief divided by layer height is not an exact feature
layer count. No successful outcome is assumed for these unexecuted comparisons.

The earlier PrusaSlicer 2.9.6 observations in
[the existing evidence record](../english-market-batch/EVIDENCE.md) remain
unchanged. They do not supply the missing observations for these new inputs.
