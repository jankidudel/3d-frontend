# Viewer measurement contracts and reproducible controls

Advanced measurements are explicitly enabled on the dedicated STL and 3MF viewers.
Other `ObjectViewerComponent` consumers retain their existing distance controls or
existing opt-out. Geometry calculation, point picking and the private record panel
are separate modules under `src/app/features/shared/feature-measurement/`.

## Frames, units and provenance

The panel stores coordinates rather than camera positions. STL picks restore the
retained centre translation to the displayed Float32 mesh. This is a source-frame
reconstruction from displayed values, not guaranteed recovery of original CAD or
pre-centering precision. 3MF picks restore the group's centre translation to
resolved build coordinates in millimetres; the original declared unit and each
placed-item ID are retained separately. Mesh, face and vertex references are local
to this loaded session; they are not durable CAD feature identifiers.

All calculations and overlays derive from the same result. JSON retains full
JavaScript numeric values, the result length basis, coordinate-to-mm factor,
display unit, selection order and per-point provenance. An unknown STL unit keeps
physical lengths unavailable without invalidating a geometric angle. Changing the
STL interpretation recomputes saved physical bases with a visible notice. Changing
the display unit only converts lengths. No geometry is rescaled by these controls.

Records are bounded to 20 entries in memory. There is no persistence, import,
server call, telemetry of record data or source filename in the export. Angular
text bindings escape names. Successful replacement clears records; rejected,
failed or cancelled replacement keeps the prior model and record. The existing
explicit issue-analysis upload remains a separate action.

## Numerical policies

`MeasurementPolicy` owns the thresholds. Angle normalizes the two legs at B and
uses `atan2(length(cross), dot)` for an unsigned 0..180 degree result. A leg must
exceed the larger of 1e-12 times the longer leg and eight machine epsilons times
the largest absolute input coordinate. This rejects unresolved translated input
without imposing a fixed physical tolerance. Collinear nonzero angle legs remain
valid: same direction gives zero and opposite direction gives 180.

Circle translates about the first point, scales the local vectors by their
largest leg and constructs a circumcentre from cross products. The sine between
the two normalized legs must exceed 1e-6. Repeated points and near-collinearity
return an unavailable reason with the points retained. This is conditioning
policy, not circularity, confidence, clearance or a physical acceptance limit.
The centre, normal and orthonormal in-plane basis are exported. Three samples
cannot independently establish whether the rest of a boundary is circular.

Selection raycasts model meshes only. It filters hidden ancestors, material
visibility and clipping, then considers just the three vertices of the nearest
eligible triangle. Candidates must lie within 24 CSS pixels (40 for touch), pass
frustum/clipping checks and not be occluded by a closer eligible surface. Equal
screen distances use local vertex index as the tie breaker; repeated coordinates
are deduplicated within that triangle. The screen radius is not measurement
uncertainty. Hover candidates, explicit candidate buttons and entered coordinates
serve different interaction/provenance paths. Drag and multiple-pointer gestures
never commit a measurement point.

## Regeneration and verification

Run from `3d-frontend`:

```sh
node --experimental-strip-types scripts/generate-feature-measurement-fixtures.mts
npx vitest run scripts/feature-measurement.spec.mts
npx ng test --watch=false --include='**/feature-measurement/*.spec.ts' --include='**/object-viewer/*.spec.ts'
```

The deterministic generator creates assets under
`public/examples/feature-measurement/`. It is never run by deployment. The manifest
records exact hashes, point references, transforms, analytical expectations and
limits. Calculation observations reopen actual stored Float32 positions before
running the production calculation. Signed zero becomes zero in JSON by standard
JSON serialization; regression comparisons use that same serialization boundary.
The public generator download is a source copy; run the canonical script in this
checkout with the existing dependencies and production calculation module.

The angle coupon is one closed triangular prism with top references A=(10,0,0),
B=(0,0,0), C=(5,5 sqrt(3),0). The separately downloadable distance coupon has a
30-40-50 top triangle. Tilt is a rigid 3D rotation plus translation; scale is x3.
The reopened reference angle is about 60.0000012622552 degrees. Two 30 x 30 x 8
blocks contain regular 12/48-sided through-bores of ideal circumradius ten. Their
analytical flat spans are 19.3185165258 and 19.9571784648, while three cardinal
vertices construct diameter twenty. The elliptical opening has ideal spans 20 by
10; different cardinal triples construct diameters 25 and 12.5. These facts are
software/analytical controls, not physical print tests.

The genuine 3MF declares centimetres and reuses one tetrahedron in two placements.
The first rotates and uniformly scales it x2, then translates by (1,2,3) source
units. The second translates by (5,2,3). Independent arithmetic and the real
resolver agree on origins (10,20,30) and (50,20,30) mm, forty millimetres apart.

Browser observations and actual downloaded records, when captured, are separate
from generated calculation observations. Never replace an unavailable interaction
check with an inferred screenshot or describe a numeric-entry run as mesh picking.
