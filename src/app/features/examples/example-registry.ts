import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { ExampleAsset } from './example-assets';
export interface PublicExample {
  readonly id: string;
  readonly name: string;
  readonly group: string;
  readonly question: string;
  readonly files: readonly {
    readonly path: string;
    readonly name: string;
    readonly bytes: number;
    readonly label?: string;
    readonly reference?: string;
  }[];
  readonly preview: string;
  readonly alt: string;
  readonly known: string;
  readonly observed: string;
  readonly settings: string;
  readonly limitations: string;
  readonly guide: string;
  readonly tools: readonly string[];
  readonly provenance: string;
}
const splitAssemblyExamples: readonly PublicExample[] = [
  {
    id: 'split-verification',
    name: 'Planar split verification',
    group: 'Split / assembly',
    question:
      'Does the selected source-coordinate plane produce two supported exports?',
    files: [
      {
        path: ExampleAsset.Closed20mmCubeStl,
        name: 'closed-20mm-cube.stl',
        bytes: 684,
        label: 'Successful central cut',
        reference:
          'Z at 50% is coordinate 10; observed exports retain Z bounds 0..10 and 10..20.',
      },
      {
        path: ExampleAsset.ShiftedCubeStl,
        name: 'shifted-cube.stl',
        bytes: 684,
        label: 'Shifted source coordinates',
        reference: 'Z bounds are -5..15, so Z at 50% is coordinate 5, not 10.',
      },
      {
        path: ExampleAsset.OpenFaceCubeStl,
        name: 'open-face-cube.stl',
        bytes: 584,
        label: 'Rejected source mesh',
        reference:
          'The precondition screen rejects the four-open-edge source before cutting.',
      },
      {
        path: ExampleAsset.SplitHollowChannelStl,
        name: 'hollow-channel-20x20x20.stl',
        bytes: 1684,
        label: 'Unsupported nested contour',
        reference:
          'The closed 20 x 20 x 20 tube is valid, but its nested mid-Z contours are rejected rather than capped across the passage.',
      },
    ],
    preview: ExampleAsset.SplitPlaneCoordinatesSvg,
    alt: 'A 20-unit cube at the origin cuts at Z ten, while the same span shifted to minus five through fifteen cuts at Z five.',
    known:
      'The cube and shifted cube are closed 20-unit controls. The open cube is missing one face. The closed tube has a 12 x 12 through-passage and analytic volume 5,120 cubic coordinate units.',
    observed:
      'Processor revision in this batch reopens valid cube exports at the original coordinates and rejects the open source and nested tube contour. Triangle counts are not treated as fixed.',
    settings:
      'Load locally, choose Z at 50%, confirm the displayed coordinate, then explicitly submit. Loading never starts a job.',
    limitations:
      'STL stores no unit. A passed geometry screen does not establish slicer placement, assembly fit or physical print success.',
    guide: GuideRouteUrl.RouteStlSplitFailed,
    tools: ['/stl-splitter'],
    provenance:
      'Original InspectMesh geometry and measured local processor results; no physical print test.',
  },
  {
    id: 'alignment-coupon',
    name: 'Alignment dowel coupon',
    group: 'Split / assembly',
    question:
      'How can nominal pin and socket dimensions be checked before changing a full model?',
    files: [
      {
        path: ExampleAsset.AlignmentBlockAStl,
        name: 'alignment-block-a.stl',
        bytes: 9684,
        label: 'Block A, socket opens on +Z',
      },
      {
        path: ExampleAsset.AlignmentBlockBStl,
        name: 'alignment-block-b.stl',
        bytes: 9684,
        label: 'Block B, socket opens on -Z',
      },
      {
        path: ExampleAsset.AlignmentDowelStl,
        name: 'alignment-dowel.stl',
        bytes: 6484,
        label: 'Separate dowel',
      },
      {
        path: ExampleAsset.SplitAssemblyManifestJson,
        name: 'manifest.json',
        bytes: 1459,
        label: 'Dimensions and reproducibility manifest',
      },
    ],
    preview: ExampleAsset.AlignmentPinJointSvg,
    alt: 'Two blind sockets receive a separate dowel, with socket diameter, pin diameter, engagement and end clearance labelled.',
    known:
      'Each block is 20 x 20 x 10 with a 4.30-diameter, 7-deep blind socket. The separate 32-sided dowel is 4.00 in diameter and 12 long.',
    observed:
      'All three generated STL files reopen as one closed component with their stated bounds. This is software geometry verification only.',
    settings:
      'Open the meshes in the viewer, then slice and print with the intended material, orientation and profile before measuring or fitting.',
    limitations:
      'The 0.30 nominal diametral clearance is illustrative, not a recommendation. No coupon was physically printed.',
    guide: GuideRouteUrl.RouteAlignmentPinsForSplit3dPrints,
    tools: ['/stl-viewer'],
    provenance:
      'Original InspectMesh generated geometry with a machine-readable manifest; no physical fit or strength test.',
  },
];
export const publicExamples: readonly PublicExample[] = [
  {
    id: 'passage-versus-boundary',
    name: 'Intact passage versus missing face',
    group: 'File handoff / interiors',
    question: 'Can an empty through-passage have a closed material boundary?',
    files: [
      { path: ExampleAsset.Hole8Stl, name: 'square-hole-8mm.stl', bytes: 1684 },
      {
        path: ExampleAsset.OpenFaceCubeStl,
        name: 'open-face-cube.stl',
        bytes: 584,
      },
      {
        path: ExampleAsset.Closed20mmCubeStl,
        name: 'closed-20mm-cube.stl',
        bytes: 684,
      },
    ],
    preview: '/examples/file-handoff/passage-and-boundary.svg',
    alt: 'Material surrounds an eight millimetre square passage, unlike an unfinished cube surface with a missing face.',
    known:
      'The 40 x 30 x 10 mm block has 32 triangles, an 8 mm square passage and analytical material volume 11,360 mm³. The open cube has 10 triangles and four boundary edges.',
    observed:
      '27 October 2026: local collection functions and the unchanged local .NET processor report zero open edges and approximately 11,360 mm³ for the passage block; the missing-face cube has four open edges and unavailable volume. Not a deployed endpoint observation.',
    settings:
      'Load the block locally, choose Inspect cross-section, Cut axis Z and Cut position 50%: its known 0..10 range puts the plane at Z=5 mm. Record the actual visible observation.',
    limitations:
      'Clipping is visual, not an extracted contour, hollowing service or proof of drainage, physical flow, access or strength. STL requires the agreed millimetre convention.',
    guide: GuideRouteUrl.RouteHowToHollowAnStlFileFor3dPrinting,
    tools: ['/stl-viewer'],
    provenance:
      'Original CC0 InspectMesh geometry. Independent ground truth and method-labelled local captures are retained with the evidence assets.',
  },
  {
    id: 'obj-companion-bundle',
    name: 'Complete OBJ companion-file bundle',
    group: 'File handoff / interiors',
    question:
      'Which appearance reference fails when an MTL or texture is missing?',
    files: [
      {
        path: ExampleAsset.ObjCompanionBundle,
        name: 'obj-companion-bundle.zip',
        bytes: 2132,
      },
    ],
    preview: '/examples/file-handoff/obj-bundle.svg',
    alt: 'The OBJ names a material library, and the material library names the original checker texture.',
    known:
      'Eight vertices, six outward-wound quad faces and 20 x 10 x 5 coordinate spans under an agreed mm convention. OBJ, MTL, original texture PNG and README are packaged together.',
    observed:
      'Focused checks verify reference paths, inventory hashes, vertex/UV indices and closed outward geometry. Receiver appearance remains untested; no receiving-application appearance observation is retained.',
    settings:
      'Extract the whole ZIP, then open sample.obj in a suitable OBJ/MTL/texture application. Compare a separate working copy missing the texture or material file; record the actual application/version and result.',
    limitations:
      'Download-only illustration. InspectMesh STL/3MF tools do not accept OBJ, MTL or ZIP uploads. No external appearance or manufactured-colour result is claimed.',
    guide: GuideRouteUrl.RouteStlVsObjFor3dPrinting,
    tools: [],
    provenance:
      'Original CC0-1.0 InspectMesh model and 16 x 16 checker image; deterministic generator and inventory retained.',
  },
  {
    id: 'quality-control-selection',
    name: 'Quality report controls',
    group: 'Boundaries / topology',
    question:
      'How do a missing face, duplicate face and malformed file differ in the report?',
    files: [
      {
        path: ExampleAsset.Closed20mmCubeStl,
        name: 'closed-20mm-cube.stl',
        bytes: 684,
      },
      {
        path: ExampleAsset.OpenFaceCubeStl,
        name: 'open-face-cube.stl',
        bytes: 584,
      },
      {
        path: ExampleAsset.DuplicateFaceCubeStl,
        name: 'duplicate-face-cube.stl',
        bytes: 734,
      },
      {
        path: ExampleAsset.DiagnosisMalformedStl,
        name: 'malformed.stl',
        bytes: 57,
      },
    ],
    preview: '/examples/diagnosis/open-boundary.svg',
    alt: 'A closed cube and a cube missing one square face illustrate report differences.',
    known:
      'The 20-coordinate cube has 12 triangles; removing a square gives 10; repeating one face gives 13. The malformed text is not STL geometry.',
    observed:
      'The processor reports zero listed issues, four open edges, one exact duplicate with three over-shared edges, and a parse error, respectively.',
    settings:
      'Download controls without uploading. Explicitly submit one at a time to the Quality Checker for a server report.',
    limitations:
      'A clean report covers supported findings only. Parsing failure is not a zero-finding result.',
    guide: GuideRouteUrl.RouteHowToCheckStlForErrors,
    tools: ['/stl-quality-checker'],
    provenance:
      'Original InspectMesh generated geometry and measured processor results; no physical print test.',
  },
  {
    id: 'topology-edge-controls',
    name: 'Open edges, over-shared edges and separate parts',
    group: 'Boundaries / topology',
    question:
      'Does this STL have an exposed edge, an over-shared edge, or two intentional closed pieces?',
    files: [
      {
        path: ExampleAsset.OpenFaceCubeStl,
        name: 'open-face-cube.stl',
        bytes: 584,
        label: 'Missing face',
        reference:
          '10 triangles and four boundary edges; a square face is absent.',
      },
      {
        path: ExampleAsset.DuplicateFaceCubeStl,
        name: 'duplicate-face-cube.stl',
        bytes: 734,
        label: 'Duplicate face',
        reference:
          '13 triangles, one exact duplicate and three over-shared edges.',
      },
      {
        path: ExampleAsset.DiagnosisSeparatedCubesStl,
        name: 'separated-cubes.stl',
        bytes: 1284,
        label: 'Two separate closed cubes',
        reference:
          '24 triangles, two vertex-connected components, and no boundary or over-shared edges; separation alone is not a defect.',
      },
    ],
    preview: '/examples/diagnosis/edge-incidence.svg',
    alt: 'One, two and three triangles incident to an edge, shown as a labelled topology diagram.',
    known:
      'One known square is absent, one exact cube face is repeated, or two closed cubes remain intentionally separate.',
    observed:
      'The processor reports four boundary edges, three over-shared edges, or two vertex-connected components without an edge defect, respectively.',
    settings:
      'Load a public control locally. Press Check manifold geometry only if you want to submit it for a server report; selecting the file alone does not submit it.',
    limitations:
      'Edge counts do not establish design intent or detect every spatial crossing.',
    guide: GuideRouteUrl.RouteWhatIsNonManifoldGeometry,
    tools: ['/stl-manifold-checker'],
    provenance:
      'Original InspectMesh geometry measured in the processor; no physical print test.',
  },
  {
    id: 'units-scale',
    name: 'Size and units',
    group: 'Size / units',
    question:
      'What changes when 20 coordinates mean inches, or are scaled to 150%?',
    files: [
      {
        path: ExampleAsset.Closed20mmCubeStl,
        name: 'closed-20mm-cube.stl',
        bytes: 684,
      },
    ],
    preview: '/examples/diagnosis/units-scale.svg',
    alt: '20 coordinates compared with 30 after 1.5\u00d7. Schematic, not an interface capture.',
    known: 'A closed cube has 20-coordinate spans and 12 triangles.',
    observed:
      'Under millimetres: 20 mm and 8,000 mm\u00b3. Under inches: 508 mm. Scaling by 1.5 exports 30-coordinate spans and 27,000 mm\u00b3 under millimetres.',
    settings:
      'Use 150% in Scale. In STL inspection explicitly choose mm or inches; a unit assumption changes interpretation, not file bytes.',
    limitations:
      'Check a known dimension in the receiving application. STL does not acquire unit metadata.',
    guide: GuideRouteUrl.RouteWhyStlFilesHaveNoUnits,
    tools: ['/stl-viewer', '/stl-scale-tool', '/stl-print-preflight'],
    provenance:
      'Original InspectMesh generated geometry; software inspection controls, no physical print test.',
  },
  {
    id: 'open-boundary',
    name: 'An open boundary',
    group: 'Boundaries / topology',
    question: 'Is the missing face a fault or an intended opening?',
    files: [
      {
        path: ExampleAsset.Closed20mmCubeStl,
        name: 'closed-20mm-cube.stl',
        bytes: 684,
      },
      {
        path: ExampleAsset.OpenFaceCubeStl,
        name: 'open-face-cube.stl',
        bytes: 584,
      },
    ],
    preview: '/examples/diagnosis/open-boundary.svg',
    alt: 'Closed surface compared with Face removed: 4 edges. Schematic, not an interface capture.',
    known: 'The second cube removes two triangles forming one square face.',
    observed:
      'Preflight reports 12 versus 10 triangles and zero versus four open edges. Open-cube volume is unavailable.',
    settings: 'Load either cube into preflight; use a millimetre assumption.',
    limitations:
      'Confirm design intent before filling. A vessel with closed wall surfaces can have a mouth without surface boundary edges.',
    guide: GuideRouteUrl.RouteHowToFixHolesInAnStlFile,
    tools: ['/stl-viewer', '/stl-print-preflight'],
    provenance:
      'Original InspectMesh generated geometry; software inspection controls, no physical print test.',
  },
  {
    id: 'sheet-versus-plate',
    name: 'Open sheet and closed plate',
    group: 'Boundaries / topology',
    question: 'Does the model enclose material or only display a surface?',
    files: [
      {
        path: ExampleAsset.DiagnosisHorizontalSheetStl,
        name: 'horizontal-sheet.stl',
        bytes: 184,
      },
      {
        path: ExampleAsset.DiagnosisVerticalSheetStl,
        name: 'vertical-sheet.stl',
        bytes: 184,
      },
      {
        path: ExampleAsset.DiagnosisClosedPlateStl,
        name: 'closed-1-unit-plate.stl',
        bytes: 684,
      },
    ],
    preview: '/examples/diagnosis/sheet-versus-plate.svg',
    alt: 'An open sheet has exposed perimeter edges; a closed plate has front, back and side faces.',
    known:
      'Two 20 by 20 coordinate-unit sheets contain two triangles each; the 20 by 20 by 1 plate contains 12.',
    observed:
      'The processor reports four boundary edges on each sheet and zero on the plate. The closed plate has 400 cubic coordinate units; an open sheet has no reliable enclosed volume.',
    settings:
      'Open locally in the STL Viewer; optional server quality analysis requires an explicit upload. No slicer output is claimed for these controls.',
    limitations:
      'STL has no unit. A vertical sheet has nonzero Z span while still lacking thickness. Edge counts do not measure arbitrary wall width.',
    guide: GuideRouteUrl.RouteZeroThicknessStlSurface,
    tools: ['/stl-viewer', '/stl-quality-checker'],
    provenance:
      'Original InspectMesh generated geometry and measured processor results; no physical print test.',
  },
  {
    id: 'internal-sheet',
    name: 'Hidden sheet versus cavity wall',
    group: 'Boundaries / topology',
    question:
      'Is an unseen internal face a defect or an intended material boundary?',
    files: [
      {
        path: ExampleAsset.Closed20mmCubeStl,
        name: 'closed-20mm-cube.stl',
        bytes: 684,
      },
      {
        path: ExampleAsset.DiagnosisInternalSheetCubeStl,
        name: 'cube-with-internal-sheet.stl',
        bytes: 784,
      },
      {
        path: ExampleAsset.OpenThroughChannelStl,
        name: 'open-through-channel.stl',
        bytes: 1684,
      },
    ],
    preview: '/examples/diagnosis/internal-sheet-channel.svg',
    alt: 'Cross-sections show a plain cube, a detached internal divider, and inner walls around an intended channel.',
    known:
      'A two-triangle square at Z10 lies wholly inside the 20-unit cube; a separate closed channel control has an intended 6 by 6 passage.',
    observed:
      'The internal-sheet cube has 14 triangles, four boundary edges and two vertex-components. The closed channel has 32 triangles and zero boundary edges.',
    settings:
      'Use Inspect cross-section in the local viewer before deciding whether an internal surface belongs.',
    limitations:
      'The processor does not label design intent or test all spatial intersections. Do not delete an inner wall solely from its area.',
    guide: GuideRouteUrl.RouteInternalFacesInStl,
    tools: ['/stl-viewer', '/stl-quality-checker'],
    provenance:
      'Original InspectMesh generated geometry and measured processor results; no physical print test.',
  },
  {
    id: 'duplicate-winding',
    name: 'Duplicate faces and winding',
    group: 'Boundaries / topology',
    question:
      'Can edge checks distinguish a duplicate from a reversed triangle?',
    files: [
      {
        path: ExampleAsset.Closed20mmCubeStl,
        name: 'closed-20mm-cube.stl',
        bytes: 684,
      },
      {
        path: ExampleAsset.DuplicateFaceCubeStl,
        name: 'duplicate-face-cube.stl',
        bytes: 734,
      },
      {
        path: ExampleAsset.DiagnosisReversedWindingCubeStl,
        name: 'reversed-winding-cube.stl',
        bytes: 684,
      },
      {
        path: ExampleAsset.DiagnosisStoredNormalCubeStl,
        name: 'stored-normal-cube.stl',
        bytes: 684,
      },
    ],
    preview: '/examples/diagnosis/duplicate-winding.svg',
    alt: 'Duplicate: 13 facets compared with Reversed: 3 conflicts. Schematic, not an interface capture.',
    known:
      'Separate copies add one exact facet, reverse one triangle, or change only one stored normal vector.',
    observed:
      'The duplicate has 13 triangles, one duplicate and three over-shared edges. Reversed winding has 12 triangles and three edge-direction conflicts. Changing only the normal vector yields zero winding conflicts.',
    settings:
      'Use millimetres. Preflight uses vertex winding; the STL stored normal vector is not this test.',
    limitations:
      'Preserve the original and correct a copy in CAD or a mesh editor. Consistent edge directions do not establish the intended outside.',
    guide: GuideRouteUrl.RouteHowToFixFlippedNormalsInAnStlFile,
    tools: ['/stl-print-preflight', '/stl-compare'],
    provenance:
      'Original InspectMesh generated geometry; software inspection controls, no physical print test.',
  },
  {
    id: 'shells-intersections',
    name: 'Separate and crossing solids',
    group: 'Boundaries / topology',
    question: 'Do zero open edges rule out intersecting solids?',
    files: [
      {
        path: ExampleAsset.DiagnosisSeparatedCubesStl,
        name: 'separated-cubes.stl',
        bytes: 1284,
      },
      {
        path: ExampleAsset.OverlappingCubesStl,
        name: 'overlapping-cubes.stl',
        bytes: 1284,
      },
    ],
    preview: '/examples/diagnosis/shells-intersections.svg',
    alt: 'Separate: 60 mm span compared with Crossing: 30 mm span. Schematic, not an interface capture.',
    known:
      'Two closed 20 mm cubes are separated by a 40 mm translation or overlap with a 10 mm translation.',
    observed:
      'Both have two components, zero open edges and zero over-shared edges. Bounds are 60 or 30 \u00d7 20 \u00d7 20 mm. Volume is withheld.',
    settings: 'Run millimetre preflight on each file.',
    limitations:
      'Inspect intentional parts and crossing surfaces in the source design. InspectMesh does not detect self intersections; touching is also different from a boolean union.',
    guide: GuideRouteUrl.RouteHowToFixNonManifoldStl,
    tools: ['/stl-viewer', '/stl-print-preflight'],
    provenance:
      'Original InspectMesh generated geometry; software inspection controls, no physical print test.',
  },
  {
    id: 'thin-features',
    name: 'Thin features in a slicer',
    group: 'Thin features / detail',
    question:
      'Why can sampled thickness and slicer paths tell different stories?',
    files: [
      {
        path: ExampleAsset.ThinWallBarsStl,
        name: 'thin-wall-bars.stl',
        bytes: 1884,
      },
      {
        path: ExampleAsset.ThinClassicGcode,
        name: 'thin-classic.gcode',
        bytes: 24245,
      },
      {
        path: ExampleAsset.ThinArachneGcode,
        name: 'thin-arachne.gcode',
        bytes: 38901,
      },
    ],
    preview: '/examples/diagnosis/thin-features.svg',
    alt: 'Bar widths: 0.3 / 0.45 / 0.9 compared with Classic vs Arachne paths. Schematic, not an interface capture.',
    known:
      'Three bars are 0.3, 0.45 and 0.9 mm wide, 20 mm long and 10 mm high.',
    observed:
      'Local sampled checker, mm and 1.2 mm threshold: 36 attempted, 36 measured, 12 below threshold, zero unmeasured, smallest about 0.29999 mm. Retained PrusaSlicer 2.9.6 second-layer previews show four Classic versus six Arachne extrusion moves. These are software observations, not prints.',
    settings:
      'STL coordinate unit mm; review threshold 1.2 mm. Slicer experiment: 0.4 mm nozzle, 0.2 mm layers, 0.45 mm width, two perimeters, zero infill, thin-wall option off.',
    limitations:
      'Review measured and unmeasured rays and the native slicer preview. Preview-only G-code must not be run on a printer. No universal minimum wall is established.',
    guide: GuideRouteUrl.Route3dPrintWallThicknessGuide,
    tools: [
      '/stl-viewer',
      '/stl-print-preflight',
      '/stl-wall-thickness-checker',
    ],
    provenance:
      'Original InspectMesh generated geometry; software inspection controls, no physical print test.',
  },
  {
    id: 'placed-wall-scales',
    name: 'One 3MF slab at two placed scales',
    group: 'Thin features / detail',
    question:
      'Does the checker include a repeated resource after a 50% placement scale?',
    files: [
      {
        path: ExampleAsset.TwoScaleSlabs3mf,
        name: 'two-scale-slabs.3mf',
        bytes: 966,
      },
    ],
    preview: '/examples/diagnosis/build-conversion.svg',
    alt: 'Diagram of one stored mesh placed twice with distinct transforms.',
    known:
      'One closed 0.8 × 10 × 10 mm slab resource is placed at full size and again at 50% scale, translated 30 mm in X after scaling.',
    observed:
      'The resolver returns two placed items with 0.8 mm and 0.4 mm X spans, separated by 29.2 mm. The sampled result must be read separately from these designed dimensions.',
    settings:
      'Declared unit: millimetre. Review threshold: 0.6 mm. Load locally, then run the sampled check.',
    limitations:
      'Combined-scene rays are not labelled by instance. The sample is a geometry control, not a print test.',
    guide: GuideRouteUrl.RouteHowToCheck3mfWallThicknessFor3dPrinting,
    tools: ['/3mf-wall-thickness-checker'],
    provenance:
      'Original InspectMesh generated 3MF using scripts/generate-collection-examples.py; no physical print test.',
  },
  {
    id: 'detail-loss',
    name: 'Detail after simplification',
    group: 'Thin features / detail',
    question: 'Does an unchanged bounding box preserve a small ridge?',
    files: [
      {
        path: ExampleAsset.DetailCouponStl,
        name: 'detail-coupon.stl',
        bytes: 1284,
      },
      {
        path: ExampleAsset.DetailCoupon75Stl,
        name: 'detail-coupon-75.stl',
        bytes: 984,
      },
      {
        path: ExampleAsset.DetailCoupon50Stl,
        name: 'detail-coupon-50.stl',
        bytes: 884,
      },
    ],
    preview: '/examples/diagnosis/detail-loss.svg',
    alt: 'Original: 24 triangles compared with Reduced: 18 / 16 triangles. Schematic, not an interface capture.',
    known:
      'A 24-triangle block and touching ridge spans 40 \u00d7 20 \u00d7 10.5 mm.',
    observed:
      'meshoptimizer 1.2.0, error 0.01, LockBorder: 75% produces 18 triangles; 50% produces 16 with two duplicates and one over-shared edge. Bounds stay unchanged.',
    settings:
      'Reducer: triangle reduction at 75%. Compare: original coordinate frame, mm on both sides, 0.1 mm tolerance, 5,000 samples per direction.',
    limitations:
      'Recheck topology and small features. A target count is a request. Sampled distance is not a global maximum or proof of print equivalence.',
    guide: GuideRouteUrl.RouteHowToReduceStlTriangleCount,
    tools: ['/stl-file-size-reducer', '/stl-compare', '/stl-print-preflight'],
    provenance:
      'Original InspectMesh generated geometry; software inspection controls, no physical print test.',
  },
  {
    id: 'build-conversion',
    name: 'Placed 3MF objects',
    group: 'Build objects / conversion',
    question:
      'How do resources, placements and declared units affect the STL export?',
    files: [
      {
        path: ExampleAsset.OnePlacedCube3mf,
        name: 'one-placed-cube.3mf',
        bytes: 973,
      },
      {
        path: ExampleAsset.TwoPlacedCubes3mf,
        name: 'two-placed-cubes.3mf',
        bytes: 979,
      },
      {
        path: ExampleAsset.DeclaredInchTransformed3mf,
        name: 'declared-inch-transformed.3mf',
        bytes: 940,
      },
    ],
    preview: '/examples/diagnosis/build-conversion.svg',
    alt: 'One resource, two placements compared with Declared inches \u2192 mm STL. Schematic, not an interface capture.',
    known:
      'One cube resource is placed once or twice. A separate inch package places a one-inch cube at X = 2 inches.',
    observed:
      'Resolved builds have 12 / 24 triangles and 20 / 60 mm X spans. Reopened inch conversion has 12 triangles, 25.4 mm spans and X = 50.8 to 76.2 mm.',
    settings:
      '3MF uses declared units. Conversion offers entire-build or single placed-item scope in millimetres; generate and verify explicitly.',
    limitations:
      'Keep the original package/project. STL loses declared units, build identity, colours, materials and project settings; unsupported extensions are not validated.',
    guide: GuideRouteUrl.Route3mfMissingObjectsAfterImport,
    tools: ['/3mf-viewer', '/3mf-print-preflight', '/3mf-to-stl-converter'],
    provenance:
      'Original InspectMesh generated geometry; software inspection controls, no physical print test.',
  },
  {
    id: 'fit-layout',
    name: 'Nominal fit and allowances',
    group: 'Fit / layout',
    question: 'Can a rotation fit after allowing space for a brim?',
    files: [
      {
        path: ExampleAsset.EnglishMarketBatchPrinterFit250x210x180Stl,
        name: 'printer-fit-250x210x180.stl',
        bytes: 684,
      },
    ],
    preview: '/examples/diagnosis/fit-layout.svg',
    alt: 'Rotation: 210 \u00d7 250 \u00d7 180 compared with 6 mm allowance: fails. Schematic, not an interface capture.',
    known:
      'A rectangular 250 \u00d7 210 \u00d7 180 mm envelope is tested against a custom 220 \u00d7 260 \u00d7 200 mm box (X / Y / Z).',
    observed:
      'Original orientation fails X. Rotation to 210 \u00d7 250 \u00d7 180 fits nominally. A 5 mm allowance on each X/Y side gives 220 \u00d7 260 \u00d7 180, exactly at two limits; 6 mm gives 222 \u00d7 262 \u00d7 180 and fails.',
    settings:
      'Enter the custom box as X / Y / Z. Preflight labels width / height / depth as X / Y / Z; no allowance is added automatically.',
    limitations:
      'Confirm usable slicer space, excluded zones, supports and clearance. These hypothetical allowances are not a support strategy or general collision check.',
    guide: GuideRouteUrl.RouteHowToCheckIfA3dModelFitsYourPrinter,
    tools: ['/stl-viewer', '/stl-print-preflight'],
    provenance:
      'Original InspectMesh generated geometry; software inspection controls, no physical print test.',
  },
  {
    id: 'gcode-absolute-extrusion',
    name: 'Absolute E and resets',
    group: 'G-code evidence',
    question: 'Absolute E and resets - what can this parser establish?',
    files: [
      {
        path: ExampleAsset.GcodeEvidenceAbsoluteExtrusionGcode,
        name: 'absolute-extrusion.gcode',
        bytes: 156,
      },
    ],
    preview: '/examples/gcode-evidence/evidence.svg',
    alt: 'Conceptual G-code review diagram; no native software screenshot.',
    known:
      'Human-auditable, incomplete analytical snippet. Initial logical XYZ/E zero; millimetres; absolute XYZ/E.',
    observed:
      'Two positive-extrusion moves and one travel move. G92 E0 resets E without moving XYZ.',
    settings: 'Initial logical XYZ/E zero; millimetres; absolute XYZ/E.',
    limitations:
      'Never execute this incomplete snippet on a printer. Initial state is a parser assumption. No physical print, firmware execution or compatibility test.',
    guide: GuideRouteUrl.RouteHowToCheckGcodeBeforePrinting,
    tools: ['/gcode-preflight-checker'],
    provenance:
      'Original hand-authored InspectMesh parser control, 10 October 2026. Downloaded bytes are exercised by regression tests; not generated by a slicer.',
  },
  {
    id: 'gcode-relative-extrusion',
    name: 'Relative E counterpart',
    group: 'G-code evidence',
    question: 'Relative E counterpart - what can this parser establish?',
    files: [
      {
        path: ExampleAsset.GcodeEvidenceRelativeExtrusionGcode,
        name: 'relative-extrusion.gcode',
        bytes: 156,
      },
    ],
    preview: '/examples/gcode-evidence/evidence.svg',
    alt: 'Conceptual G-code review diagram; no native software screenshot.',
    known:
      'Human-auditable, incomplete analytical snippet. Explicit M83 after G90; no claim about every firmware mode transition.',
    observed:
      'Three positive-extrusion moves. Consecutive E1 values are incremental in the disclosed model.',
    settings:
      'Explicit M83 after G90; no claim about every firmware mode transition.',
    limitations:
      'Never execute this incomplete snippet on a printer. Initial state is a parser assumption. No physical print, firmware execution or compatibility test.',
    guide: GuideRouteUrl.RouteHowToCheckGcodeBeforePrinting,
    tools: ['/gcode-preflight-checker'],
    provenance:
      'Original hand-authored InspectMesh parser control, 10 October 2026. Downloaded bytes are exercised by regression tests; not generated by a slicer.',
  },
  {
    id: 'gcode-shifted-location',
    name: 'Small path outside bounds',
    group: 'G-code evidence',
    question: 'Small path outside bounds - what can this parser establish?',
    files: [
      {
        path: ExampleAsset.GcodeEvidenceShiftedLocationGcode,
        name: 'shifted-location.gcode',
        bytes: 127,
      },
    ],
    preview: '/examples/gcode-evidence/bounds.svg',
    alt: 'Conceptual G-code review diagram; no native software screenshot.',
    known:
      'Human-auditable, incomplete analytical snippet. Enter X/Y=0..220, Z=0..200; compare location as well as size.',
    observed:
      'Positive-extrusion X=230..240 is 10 mm wide but outside reviewed X=0..220.',
    settings: 'Enter X/Y=0..220, Z=0..200; compare location as well as size.',
    limitations:
      'Never execute this incomplete snippet on a printer. Initial state is a parser assumption. No physical print, firmware execution or compatibility test.',
    guide: GuideRouteUrl.RouteGcodeOutsidePrintBed,
    tools: ['/gcode-preflight-checker'],
    provenance:
      'Original hand-authored InspectMesh parser control, 10 October 2026. Downloaded bytes are exercised by regression tests; not generated by a slicer.',
  },
  {
    id: 'gcode-travel-outside',
    name: 'Extrusion inside, travel outside',
    group: 'G-code evidence',
    question:
      'Extrusion inside, travel outside - what can this parser establish?',
    files: [
      {
        path: ExampleAsset.GcodeEvidenceTravelOutsideGcode,
        name: 'travel-outside.gcode',
        bytes: 139,
      },
    ],
    preview: '/examples/gcode-evidence/scopes.svg',
    alt: 'Conceptual G-code review diagram; no native software screenshot.',
    known:
      'Human-auditable, incomplete analytical snippet. Hypothetical X/Y=0..220, Z=0..200; no collision conclusion.',
    observed:
      'Positive extrusion X=10..110, Y=20..120, Z=0.2..20 lies inside entered bounds; all linear motion reaches X=230.',
    settings: 'Hypothetical X/Y=0..220, Z=0..200; no collision conclusion.',
    limitations:
      'Never execute this incomplete snippet on a printer. Initial state is a parser assumption. No physical print, firmware execution or compatibility test.',
    guide: GuideRouteUrl.RouteGcodeOutsidePrintBed,
    tools: ['/gcode-preflight-checker'],
    provenance:
      'Original hand-authored InspectMesh parser control, 10 October 2026. Downloaded bytes are exercised by regression tests; not generated by a slicer.',
  },
  {
    id: 'gcode-unsupported-arc',
    name: 'Unsupported arc and macro',
    group: 'G-code evidence',
    question: 'Unsupported arc and macro - what can this parser establish?',
    files: [
      {
        path: ExampleAsset.GcodeEvidenceUnsupportedArcGcode,
        name: 'unsupported-arc.gcode',
        bytes: 152,
      },
    ],
    preview: '/examples/gcode-evidence/evidence.svg',
    alt: 'Conceptual G-code review diagram; no native software screenshot.',
    known:
      'Human-auditable, incomplete analytical snippet. Arcs and macro effects are omitted; later points are not complete machine-space geometry.',
    observed:
      'Incomplete linear and extrusion coverage. Arc and macro evidence retain original lines.',
    settings:
      'Arcs and macro effects are omitted; later points are not complete machine-space geometry.',
    limitations:
      'Never execute this incomplete snippet on a printer. Initial state is a parser assumption. No physical print, firmware execution or compatibility test.',
    guide: GuideRouteUrl.RouteGcodePreviewIncomplete,
    tools: ['/gcode-preflight-checker'],
    provenance:
      'Original hand-authored InspectMesh parser control, 10 October 2026. Downloaded bytes are exercised by regression tests; not generated by a slicer.',
  },
  {
    id: 'gcode-ambiguous-metadata',
    name: 'Missing and ambiguous metadata',
    group: 'G-code evidence',
    question:
      'Missing and ambiguous metadata - what can this parser establish?',
    files: [
      {
        path: ExampleAsset.GcodeEvidenceAmbiguousMetadataGcode,
        name: 'ambiguous-metadata.gcode',
        bytes: 155,
      },
    ],
    preview: '/examples/gcode-evidence/evidence.svg',
    alt: 'Conceptual G-code review diagram; no native software screenshot.',
    known:
      'Human-auditable, incomplete analytical snippet. No verified single-run duration or single-filament grams format.',
    observed: 'Duration/material offers unavailable, with no fabricated zero.',
    settings:
      'No verified single-run duration or single-filament grams format.',
    limitations:
      'Never execute this incomplete snippet on a printer. Initial state is a parser assumption. No physical print, firmware execution or compatibility test.',
    guide: GuideRouteUrl.RouteGcodePreviewIncomplete,
    tools: ['/gcode-preflight-checker'],
    provenance:
      'Original hand-authored InspectMesh parser control, 10 October 2026. Downloaded bytes are exercised by regression tests; not generated by a slicer.',
  },
  {
    id: 'gcode-malformed-number',
    name: 'Malformed numeric input',
    group: 'G-code evidence',
    question: 'Malformed numeric input - what can this parser establish?',
    files: [
      {
        path: ExampleAsset.GcodeEvidenceMalformedNumberGcode,
        name: 'malformed-number.gcode',
        bytes: 95,
      },
    ],
    preview: '/examples/gcode-evidence/evidence.svg',
    alt: 'Conceptual G-code review diagram; no native software screenshot.',
    known:
      'Human-auditable, incomplete analytical snippet. Malformed numeric input is separate from an incomplete but readable path.',
    observed:
      'Import fails at original line 3 including the analytical-only header.',
    settings:
      'Malformed numeric input is separate from an incomplete but readable path.',
    limitations:
      'Never execute this incomplete snippet on a printer. Initial state is a parser assumption. No physical print, firmware execution or compatibility test.',
    guide: GuideRouteUrl.RouteGcodePreviewIncomplete,
    tools: ['/gcode-preflight-checker'],
    provenance:
      'Original hand-authored InspectMesh parser control, 10 October 2026. Downloaded bytes are exercised by regression tests; not generated by a slicer.',
  },
  {
    id: 'gcode-comments-only',
    name: 'Comments-only input',
    group: 'G-code evidence',
    question: 'Comments-only input - what can this parser establish?',
    files: [
      {
        path: ExampleAsset.GcodeEvidenceCommentsOnlyGcode,
        name: 'comments-only.gcode',
        bytes: 128,
      },
    ],
    preview: '/examples/gcode-evidence/evidence.svg',
    alt: 'Conceptual G-code review diagram; no native software screenshot.',
    known:
      'Human-auditable, incomplete analytical snippet. A comments-only file is not a valid simulated empty print.',
    observed: 'Unavailable: no readable linear motion.',
    settings: 'A comments-only file is not a valid simulated empty print.',
    limitations:
      'Never execute this incomplete snippet on a printer. Initial state is a parser assumption. No physical print, firmware execution or compatibility test.',
    guide: GuideRouteUrl.RouteGcodePreviewIncomplete,
    tools: ['/gcode-preflight-checker'],
    provenance:
      'Original hand-authored InspectMesh parser control, 10 October 2026. Downloaded bytes are exercised by regression tests; not generated by a slicer.',
  },
  {
    id: 'gcode-reviewed-estimates',
    name: 'Declared estimate handoff control',
    group: 'G-code evidence',
    question:
      'Declared estimate handoff control - what can this parser establish?',
    files: [
      {
        path: ExampleAsset.GcodeEvidenceReviewedEstimatesGcode,
        name: 'reviewed-estimates.gcode',
        bytes: 227,
      },
    ],
    preview: '/examples/gcode-evidence/evidence.svg',
    alt: 'Conceptual G-code review diagram; no native software screenshot.',
    known:
      'Human-auditable, incomplete analytical snippet. Hand-authored metadata-format control, not a slicer export or measured consumption.',
    observed:
      'Recognises 1.5 hours and 12.5 g declarations; destination requires deliberate apply.',
    settings:
      'Hand-authored metadata-format control, not a slicer export or measured consumption.',
    limitations:
      'Never execute this incomplete snippet on a printer. Initial state is a parser assumption. No physical print, firmware execution or compatibility test.',
    guide: GuideRouteUrl.RouteHowToCheckGcodeBeforePrinting,
    tools: ['/gcode-preflight-checker'],
    provenance:
      'Original hand-authored InspectMesh parser control, 10 October 2026. Downloaded bytes are exercised by regression tests; not generated by a slicer.',
  },
  {
    id: 'parts-unplaced-resource',
    name: 'Stored but unplaced resource',
    group: '3MF placements / export',
    question: 'Stored but unplaced resource - which scope can resolve?',
    files: [
      {
        path: ExampleAsset.PartInspectionUnplacedResource3mf,
        name: 'unplaced-resource.3mf',
        bytes: 990,
      },
    ],
    preview: '/examples/part-inspection/resource-placements.svg',
    alt: 'One resource, two placements; mathematical schematic.',
    known:
      'Two object resources, two placements of resource 1. Stored 100 mm cube 2 is unplaced.',
    observed:
      'Complete build X=0..60, Y/Z=0..20 mm; 24 triangles. Selecting build-2 gives X=40..60 and 12 triangles.',
    settings:
      'Choose the named control, select scope explicitly; STL receiving convention is millimetres.',
    limitations:
      'Original mathematical software control. Invalid/unsupported packages are deliberately diagnostic-only; no physical print, full schema or slicer compatibility test.',
    guide: GuideRouteUrl.RouteExtractPartFrom3mf,
    tools: ['/3mf-viewer', '/3mf-to-stl-converter', '/3mf-print-preflight'],
    provenance:
      'Original InspectMesh deterministic generator scripts/generate-collection-examples.py, 11 October 2026; independent coordinate regression tests.',
  },
  {
    id: 'parts-nested-rotation',
    name: 'Noncommuting nested transforms',
    group: '3MF placements / export',
    question: 'Noncommuting nested transforms - which scope can resolve?',
    files: [
      {
        path: ExampleAsset.PartInspectionNestedRotation3mf,
        name: 'nested-rotation.3mf',
        bytes: 980,
      },
    ],
    preview: '/examples/part-inspection/build-selected-bounds.svg',
    alt: 'Entire build and selected item; mathematical schematic.',
    known:
      '10 × 20 × 30 mm box; child +90° Z rotation, parent +40 mm X translation.',
    observed:
      'X=20..40, Y=0..10, Z=0..30 mm; spans 20 × 10 × 30; selected composite has 12 triangles.',
    settings:
      'Choose the named control, select scope explicitly; STL receiving convention is millimetres.',
    limitations:
      'Original mathematical software control. Invalid/unsupported packages are deliberately diagnostic-only; no physical print, full schema or slicer compatibility test.',
    guide: GuideRouteUrl.RouteExtractPartFrom3mf,
    tools: ['/3mf-viewer', '/3mf-to-stl-converter', '/3mf-print-preflight'],
    provenance:
      'Original InspectMesh deterministic generator scripts/generate-collection-examples.py, 11 October 2026; independent coordinate regression tests.',
  },
  {
    id: 'parts-coincident-placements',
    name: 'Coincident placements',
    group: '3MF placements / export',
    question: 'Coincident placements - which scope can resolve?',
    files: [
      {
        path: ExampleAsset.PartInspectionCoincidentPlacements3mf,
        name: 'coincident-placements.3mf',
        bytes: 933,
      },
    ],
    preview: '/examples/part-inspection/resource-placements.svg',
    alt: 'One resource, two placements; mathematical schematic.',
    known: 'One 20 mm cube resource placed twice at identical coordinates.',
    observed:
      'Two identities, 24 triangles and 20 mm spans. Geometry is retained twice; no union claim.',
    settings:
      'Choose the named control, select scope explicitly; STL receiving convention is millimetres.',
    limitations:
      'Original mathematical software control. Invalid/unsupported packages are deliberately diagnostic-only; no physical print, full schema or slicer compatibility test.',
    guide: GuideRouteUrl.Route3mfToStlCombinedOrSeparateParts,
    tools: ['/3mf-viewer', '/3mf-to-stl-converter', '/3mf-print-preflight'],
    provenance:
      'Original InspectMesh deterministic generator scripts/generate-collection-examples.py, 11 October 2026; independent coordinate regression tests.',
  },
  {
    id: 'parts-required-extension',
    name: 'Required extension aliases',
    group: '3MF placements / export',
    question: 'Required extension aliases - which scope can resolve?',
    files: [
      {
        path: ExampleAsset.PartInspectionRequiredExtension3mf,
        name: 'required-extension.3mf',
        bytes: 963,
      },
      {
        path: ExampleAsset.PartInspectionRequiredExtensionAlias3mf,
        name: 'required-extension-alias.3mf',
        bytes: 966,
      },
    ],
    preview: '/examples/part-inspection/scope-verification.svg',
    alt: 'Source to scope to derivative check; mathematical schematic.',
    known:
      'Same required production namespace declared under two different aliases.',
    observed:
      'Both packages stop with Unsupported required semantics; no complete-build export.',
    settings:
      'Choose the named control, select scope explicitly; STL receiving convention is millimetres.',
    limitations:
      'Original mathematical software control. Invalid/unsupported packages are deliberately diagnostic-only; no physical print, full schema or slicer compatibility test.',
    guide: GuideRouteUrl.RouteWhyWontMy3mfFileSlice,
    tools: ['/3mf-viewer', '/3mf-to-stl-converter', '/3mf-print-preflight'],
    provenance:
      'Original InspectMesh deterministic generator scripts/generate-collection-examples.py, 11 October 2026; independent coordinate regression tests.',
  },
  {
    id: 'parts-bad-reference',
    name: 'Invalid build reference',
    group: '3MF placements / export',
    question: 'Invalid build reference - which scope can resolve?',
    files: [
      {
        path: ExampleAsset.PartInspectionBadReference3mf,
        name: 'bad-reference.3mf',
        bytes: 937,
      },
    ],
    preview: '/examples/part-inspection/scope-verification.svg',
    alt: 'Source to scope to derivative check; mathematical schematic.',
    known: 'Valid cube followed by a missing object 99.',
    observed: 'Invalid model data. No silently reduced successful export.',
    settings:
      'Choose the named control, select scope explicitly; STL receiving convention is millimetres.',
    limitations:
      'Original mathematical software control. Invalid/unsupported packages are deliberately diagnostic-only; no physical print, full schema or slicer compatibility test.',
    guide: GuideRouteUrl.RouteWhyWontMy3mfFileSlice,
    tools: ['/3mf-viewer', '/3mf-to-stl-converter', '/3mf-print-preflight'],
    provenance:
      'Original InspectMesh deterministic generator scripts/generate-collection-examples.py, 11 October 2026; independent coordinate regression tests.',
  },
  {
    id: 'parts-component-cycle',
    name: 'Cyclic component reference',
    group: '3MF placements / export',
    question: 'Cyclic component reference - which scope can resolve?',
    files: [
      {
        path: ExampleAsset.PartInspectionComponentCycle3mf,
        name: 'component-cycle.3mf',
        bytes: 812,
      },
    ],
    preview: '/examples/part-inspection/scope-verification.svg',
    alt: 'Source to scope to derivative check; mathematical schematic.',
    known: 'Object 1 references itself.',
    observed: 'Invalid model data; bounded failure, no download.',
    settings:
      'Choose the named control, select scope explicitly; STL receiving convention is millimetres.',
    limitations:
      'Original mathematical software control. Invalid/unsupported packages are deliberately diagnostic-only; no physical print, full schema or slicer compatibility test.',
    guide: GuideRouteUrl.RouteWhyWontMy3mfFileSlice,
    tools: ['/3mf-viewer', '/3mf-to-stl-converter', '/3mf-print-preflight'],
    provenance:
      'Original InspectMesh deterministic generator scripts/generate-collection-examples.py, 11 October 2026; independent coordinate regression tests.',
  },
  {
    id: 'encoding-review',
    name: 'Encoding and repeated binary bytes',
    group: 'Reduction / exact bytes',
    question: 'Does binary encoding actually save bytes?',
    files: [
      {
        path: ExampleAsset.ReductionReviewCubeAsciiStl,
        name: 'cube-ascii.stl',
        bytes: 1117,
      },
      {
        path: ExampleAsset.ReductionReviewCubeBinaryStl,
        name: 'cube-binary.stl',
        bytes: 684,
      },
      {
        path: ExampleAsset.ReductionReviewCubeShiftedX3Stl,
        name: 'cube-shifted-x3.stl',
        bytes: 684,
      },
    ],
    preview: '/examples/reduction-review/storage-surfaces.svg',
    alt: 'Encoding and repeated binary bytes; original analytical diagram.',
    known: '12 triangles; cube 0..20. Shifted control X=3..23, Y/Z=0..20.',
    observed:
      'Binary cube has exactly 684 bytes. Repeated encoding cannot promise positive savings.',
    settings:
      'Choose an operation explicitly. Inline comparison: original coordinates, same units, 0.1 mm tolerance, 5,000 samples per direction.',
    limitations:
      'Touching shells are not a Boolean solid; no physical validation. Finite samples can miss the narrow rib.',
    guide: GuideRouteUrl.RouteAsciiVsBinaryStl,
    tools: ['/stl-file-size-reducer', '/stl-compare'],
    provenance:
      'Original InspectMesh generated geometry. No customer models or physical testing.',
  },
  {
    id: 'precision-review',
    name: 'Stored Float32 versus displayed decimals',
    group: 'Reduction / exact bytes',
    question: 'Does a readable number prove exact storage?',
    files: [
      {
        path: ExampleAsset.ReductionReviewDecimalOffsetAsciiStl,
        name: 'decimal-offset-ascii.stl',
        bytes: 1189,
      },
    ],
    preview: '/examples/reduction-review/display-storage.svg',
    alt: 'Stored Float32 versus displayed decimals; original analytical diagram.',
    known: 'ASCII X coordinates are 0.1 and 20.1; Y/Z are 0 and 20.',
    observed:
      'Float32 reopens 0.1 as 0.10000000149011612 and 20.1 as 20.100000381469727. Display rounding does not replace these stored values.',
    settings:
      'Choose an operation explicitly. Inline comparison: original coordinates, same units, 0.1 mm tolerance, 5,000 samples per direction.',
    limitations:
      'Touching shells are not a Boolean solid; no physical validation. Finite samples can miss the narrow rib.',
    guide: GuideRouteUrl.RouteAsciiVsBinaryStl,
    tools: ['/stl-file-size-reducer', '/stl-compare'],
    provenance:
      'Original InspectMesh generated geometry. No customer models or physical testing.',
  },
  {
    id: 'narrow-rib-review',
    name: 'A missing narrow rib at equal bounds',
    group: 'Reduction / exact bytes',
    question: 'Can equal bounds approve a local feature?',
    files: [
      {
        path: ExampleAsset.NarrowRibOriginalStl,
        name: 'narrow-rib-original.stl',
        bytes: 1884,
      },
      {
        path: ExampleAsset.NarrowRibRemovedStl,
        name: 'narrow-rib-removed.stl',
        bytes: 1284,
      },
    ],
    preview: '/examples/reduction-review/local-feature.svg',
    alt: 'A missing narrow rib at equal bounds; original analytical diagram.',
    known:
      '20-coordinate cube, a 2 \u00d7 2 \u00d7 0.2 marker, and a 2 \u00d7 0.1 \u00d7 0.2 rib at (9, 9, 20). Diagnostic revision removes only the narrow rib.',
    observed:
      '36 versus 24 triangles; both retain the same outer bounds because the marker stays. This is a hand-authored feature-difference control, not a simplifier output.',
    settings:
      'Choose an operation explicitly. Inline comparison: original coordinates, same units, 0.1 mm tolerance, 5,000 samples per direction.',
    limitations:
      'Touching shells are not a Boolean solid; no physical validation. Finite samples can miss the narrow rib.',
    guide: GuideRouteUrl.RouteHowToReduceStlTriangleCount,
    tools: ['/stl-file-size-reducer', '/stl-compare'],
    provenance:
      'Original InspectMesh generated geometry. No customer models or physical testing.',
  },
  {
    id: 'floating-parts-removal',
    name: 'Cube and two detached fragments',
    group: 'Boundaries / topology',
    question:
      'Can I review disconnected pieces and download only the chosen body?',
    files: [
      {
        path: ExampleAsset.CubePlusTwoFragmentsBinaryStl,
        name: 'cube-plus-two-fragments-binary.stl',
        bytes: 1084,
      },
      {
        path: ExampleAsset.CubePlusTwoFragmentsAsciiStl,
        name: 'cube-plus-two-fragments-ascii.stl',
        bytes: 1868,
      },
    ],
    preview: '/examples/floating-parts/cube-fragments.svg',
    alt: 'Annotated schematic of the generated cube and two detached tetrahedra, not a slicer screenshot.',
    known:
      'A 20-unit cube (12 triangles) and detached 3-unit and 2-unit tetrahedra (4 triangles each): 3 parts and 20 triangles.',
    observed:
      'The edge-connected removal analysis finds 3 parts. Explicitly keeping the cube exports 12 triangles; the saved copy retains its original coordinates, winding and 20-unit dimensions.',
    settings:
      'On STL Repair, choose the generated example to open review automatically, press Keep largest part, inspect the reversible selection, then download the STL with kept pieces. Millimetres are assumed, not stored in STL.',
    limitations:
      'The example defines which body is intended. Real files require design review; cavity boundaries and lettering can be necessary. Removal does not generate supports or establish printability.',
    guide: GuideRouteUrl.RouteStlMultipleShellsDisconnectedParts,
    tools: ['/stl-repair', '/stl-print-preflight'],
    provenance:
      'Original InspectMesh generated mathematical geometry, reproduced by scripts/generate-floating-parts-fixtures.mts. No physical print evidence.',
  },
  {
    id: 'floating-parts-intentional',
    name: 'Two intended separate pieces',
    group: 'Boundaries / topology',
    question: 'Does a second component mean that I should delete it?',
    files: [
      {
        path: ExampleAsset.TwoIntendedPartsBinaryStl,
        name: 'two-intended-parts-binary.stl',
        bytes: 1284,
      },
    ],
    preview: '/examples/floating-parts/intended-parts.svg',
    alt: 'Annotated schematic of two intended cubes, both retained by default.',
    known:
      '20-unit and 19-unit cubes: 2 parts, 12 triangles each, surface areas 2,400 and 2,166 square coordinate units.',
    observed:
      'Both pieces start retained. The largest-area comparison is within 10%, so the interface warns before treating the shortcut as an intended-part decision.',
    settings:
      'Choose the file on STL Repair. Review each piece; manual selections and the largest-area proposal are reversible before explicit download.',
    limitations:
      'A size-based shortcut cannot identify artistic or assembly intent. STL units are assumed; the files do not prove physical assembly or printability.',
    guide: GuideRouteUrl.RouteStlMultipleShellsDisconnectedParts,
    tools: ['/stl-repair'],
    provenance:
      'Original InspectMesh generated mathematical geometry, reproduced by scripts/generate-floating-parts-fixtures.mts. No physical print evidence.',
  },
  {
    id: 'slicer-floating-regions',
    name: 'Floating-region diagnosis',
    group: 'Slicer diagnosis',
    question: 'Is the region unsupported, detached or an intended second part?',
    files: [
      {
        path: ExampleAsset.IntegralOverhangStl,
        name: 'integral-overhang.stl',
        bytes: 1084,
      },
      {
        path: ExampleAsset.DetachedTetrahedronStl,
        name: 'detached-tetrahedron.stl',
        bytes: 884,
      },
      {
        path: ExampleAsset.TwoIntendedCubesStl,
        name: 'two-intended-cubes.stl',
        bytes: 1284,
      },
      {
        path: ExampleAsset.OverhangNoSupportGcode,
        name: 'integral-overhang-no-support.gcode',
        bytes: 127544,
      },
      {
        path: ExampleAsset.OverhangSupportGcode,
        name: 'integral-overhang-support.gcode',
        bytes: 179552,
      },
    ],
    preview: '/examples/slicer-diagnosis/overhang-layer.svg',
    alt: 'Actual 5.2 mm layer paths: support-off versus support-on.',
    known:
      'A 20-triangle continuous arm, a 16-triangle cube plus tetrahedron and two intended 10 mm cubes.',
    observed:
      'PrusaSlicer 2.9.6 warned about floating bridge anchors without support; the support-on run has 20 support moves at Z=5.2 mm versus none without support.',
    settings:
      'Default 200 × 200 mm bed; centred at 100,100; 0.4 mm nozzle, 0.45 mm width, 0.2 mm layer and first layer, two perimeters, 15% infill.',
    limitations:
      'Software paths are not physical print evidence. The support outcome depends on profile and orientation.',
    guide: GuideRouteUrl.RouteFloatingRegionsInSlicer,
    tools: ['/stl-print-preflight', '/stl-repair'],
    provenance:
      'Original InspectMesh geometry and retained PrusaSlicer G-code generated 14 October 2026.',
  },
  {
    id: 'slicer-placement',
    name: 'Source coordinates and slicer placement',
    group: 'Slicer diagnosis',
    question: 'Can a 20 mm cube be outside a 200 mm bed?',
    files: [
      { path: ExampleAsset.OriginCubeStl, name: 'origin-cube.stl', bytes: 684 },
      {
        path: ExampleAsset.ShiftedCubeStl,
        name: 'shifted-cube.stl',
        bytes: 684,
      },
      {
        path: ExampleAsset.ShiftedCubePlacedGcode,
        name: 'shifted-cube.gcode',
        bytes: 438758,
      },
    ],
    preview: '/examples/slicer-diagnosis/placement.svg',
    alt: 'A 20 mm source cube at X230 to 250 lies beyond a 200 mm bed; a tested center operation relocates it.',
    known:
      'Both cubes have 20 mm spans; shifted bounds are X230..250, Y20..40 and Z-5..15, assuming millimetres.',
    observed:
      'PrusaSlicer 2.9.6 with --dont-arrange reported all objects outside print volume; --center 100,100 yielded G-code byte-identical to the origin control.',
    settings:
      'Default 200 × 200 mm bed; 0.4 mm nozzle, 0.45 mm width, 0.2 mm layers, two perimeters and 100% rectilinear infill.',
    limitations:
      'The diagram represents source bounds and the tested placement, not a universal import rule or machine safety check.',
    guide: GuideRouteUrl.RouteStlModelOffBuildPlate,
    tools: ['/stl-dimensions-checker', '/stl-viewer'],
    provenance:
      'Original InspectMesh geometry and retained PrusaSlicer G-code generated 14 October 2026.',
  },
  {
    id: 'slicer-channel',
    name: 'A channel that stays open or fills',
    group: 'Slicer diagnosis',
    question: 'Why did an intended through-channel become solid paths?',
    files: [
      {
        path: ExampleAsset.OpenThroughChannelStl,
        name: 'open-through-channel.stl',
        bytes: 1684,
      },
      {
        path: ExampleAsset.CappedChannelStl,
        name: 'capped-channel.stl',
        bytes: 684,
      },
      {
        path: ExampleAsset.OverlappingChannelStl,
        name: 'overlapping-channel.stl',
        bytes: 2284,
      },
      {
        path: ExampleAsset.OpenThroughChannelGcode,
        name: 'open-through-channel.gcode',
        bytes: 364940,
      },
      {
        path: ExampleAsset.CappedChannelGcode,
        name: 'capped-channel.gcode',
        bytes: 227568,
      },
      {
        path: ExampleAsset.OverlappingChannelGcode,
        name: 'overlapping-channel.gcode',
        bytes: 227568,
      },
    ],
    preview: '/examples/slicer-diagnosis/channel-layer.svg',
    alt: 'Actual first-layer paths show a clear channel centre versus filled central extrusion.',
    known:
      'The control has a 6 × 6 mm through-channel; a solid cap or an overlapping cube closes its intended path. All have zero open edges.',
    observed:
      'In PrusaSlicer 2.9.6, the open channel has no extrusion within 1 mm of centre on the first layer; the cap and overlap each have six and identical complete G-code.',
    settings:
      'Default 200 × 200 mm bed; 0.4 mm nozzle, 0.45 mm width, 0.2 mm layers, two perimeters and 100% rectilinear infill.',
    limitations:
      'One profile and layer comparison cannot establish physical hole accuracy or diagnose an arbitrary customer file.',
    guide: GuideRouteUrl.RouteSlicerFillsHoleInStl,
    tools: ['/stl-viewer', '/stl-print-preflight'],
    provenance:
      'Original InspectMesh geometry and retained PrusaSlicer G-code generated 14 October 2026.',
  },
  {
    id: 'axis-orientation-control',
    name: 'Tilted asymmetric orientation control',
    group: 'Orientation / support access',
    question:
      'Which source axis and face should become the base after a tilted import?',
    files: [
      {
        path: ExampleAsset.TiltedAsymmetricBlockStl,
        name: 'tilted-asymmetric-block.stl',
        bytes: 884,
        reference:
          'Designed as a 40 × 25 × 12 mm chamfered block, then rotated X 20°, Y -15°, Z 10° and translated by (8, -4, 3).',
      },
    ],
    preview: '/examples/orientation-support/lay-flat-control.svg',
    alt: 'A designed base, tilted imported model and face-aligned result shown as separate observations.',
    known:
      'The intended base is the source Z=0 face. A 4 mm chamfer distinguishes the source +X/+Z edge, so 90-degree alternatives do not look equivalent.',
    observed:
      'The published Float32 STL has 16 triangles and bounds about X -0.4203..46.0500, Y -8.5487..25.4604 and Z 3..31.4687 coordinate units.',
    settings:
      'Load locally in the orientation planner, assume millimetres, and compare all six source-axis-up rows at a 45° threshold.',
    limitations:
      'This mathematical control is not a physical adhesion test. The planner does not export a transformed STL.',
    guide: GuideRouteUrl.RouteHowToLayAnStlFlatOnPrintBed,
    tools: ['/3d-print-orientation-planner', '/stl-viewer'],
    provenance:
      'Original InspectMesh geometry generated 18 October 2026; exact transform is retained in the public manifest.',
  },
  {
    id: 'bridge-overhang-pair',
    name: 'Matched bridge and cantilever roofs',
    group: 'Orientation / support access',
    question:
      'Does the same 16 mm underside have two anchors or only one root?',
    files: [
      {
        path: ExampleAsset.BridgeRoofStl,
        name: 'bridge-roof.stl',
        bytes: 2284,
        label: 'Two-anchor bridge',
        reference:
          'Two 10 × 10 × 10 mm pillars, a 16 mm gap and a 2 mm roof; 44 triangles and 36 × 10 × 12 mm bounds.',
      },
      {
        path: ExampleAsset.CantileverRoofStl,
        name: 'cantilever-roof.stl',
        bytes: 1484,
        label: 'One-root cantilever',
        reference:
          'One 10 × 10 × 10 mm base and the same 16 × 10 mm underside under a 2 mm roof; 28 triangles and 26 × 10 × 12 mm bounds.',
      },
    ],
    preview: '/examples/orientation-support/bridge-overhang.svg',
    alt: 'A roof with anchors at both ends compared with the same span extending from one root.',
    known:
      'Both controls are closed, one-component meshes with a 160 mm² horizontal roof underside under an explicit millimetre assumption.',
    observed:
      'At +Z and a 45° vertical-reference threshold, the current checker reports 360 mm² flagged for the bridge and 260 mm² for the cantilever. Each includes the same 160 mm² roof underside; the extra base bottoms differ, and the result does not identify anchors.',
    settings:
      'Load each file locally in the STL Overhang Checker with millimetres, +Z up and a 45° threshold, then inspect the first underside layer in a native slicer.',
    limitations:
      'No physical bridge length or finish is claimed. Slicer-path observations depend on the retained software profile.',
    guide: GuideRouteUrl.Route3dPrintBridgeVsOverhang,
    tools: ['/stl-overhang-checker', '/stl-viewer'],
    provenance:
      'Original InspectMesh mathematical geometry generated 18 October 2026; no physical print test.',
  },
  {
    id: 'internal-support-access',
    name: 'Through-channel and narrow-access chamber',
    group: 'Orientation / support access',
    question:
      'Can internal support leave through a direct opening or only through a narrow neck?',
    files: [
      {
        path: ExampleAsset.StraightThroughChannelStl,
        name: 'straight-through-channel.stl',
        bytes: 3284,
        label: 'Straight 8 × 8 mm channel',
        reference:
          'Closed 40 × 20 × 20 mm material boundary with an 8 × 8 mm passage open through source X.',
      },
      {
        path: ExampleAsset.NarrowAccessCavityStl,
        name: 'narrow-access-cavity.stl',
        bytes: 14284,
        label: 'Chamber behind a 4 × 4 mm neck',
        reference:
          'Closed 40 × 30 × 24 mm material boundary with a 26 × 20 × 14 mm chamber reached through an 8 mm long 4 × 4 mm opening.',
      },
    ],
    preview: '/examples/orientation-support/support-access.svg',
    alt: 'A direct through-channel is compared with a larger internal chamber behind a narrow neck.',
    known:
      'Both files describe closed material surfaces. An open passage inside a watertight surface is not an open mesh.',
    observed:
      'Cross-section exposes both void boundaries and their openings. It does not simulate tool reach, support breakaway force or surface damage.',
    settings:
      'Open locally in the STL Viewer, move the clipping plane through the void, then slice the intended orientation with a recorded profile.',
    limitations:
      'The 4 × 4 mm access dimension is source geometry, not proof that generated support can be removed physically.',
    guide: GuideRouteUrl.RouteSupportsInsideHolesAndChannels,
    tools: ['/stl-viewer', '/stl-overhang-checker'],
    provenance:
      'Original InspectMesh mathematical geometry generated 18 October 2026; no physical removal test.',
  },
  {
    id: 'transformed-overhang-3mf',
    name: 'Translated and rotated 3MF ramp',
    group: 'Orientation / support access',
    question:
      'Does a placed 3MF rotation change the downward-facing area before analysis?',
    files: [
      {
        path: ExampleAsset.TranslatedRamp3mf,
        name: 'translated-ramp.3mf',
        bytes: 1050,
        label: 'Translation only',
      },
      {
        path: ExampleAsset.RotatedRamp3mf,
        name: 'rotated-ramp.3mf',
        bytes: 1053,
        label: '180° X rotation',
      },
    ],
    preview: '/examples/orientation-support/transformed-3mf.svg',
    alt: 'Translation preserves the ramp face directions while rotation changes which face points downward.',
    known:
      'Each millimetre-declared package places one 12-triangle asymmetric ramp. One item is translated; the other is rotated 180° about X and translated.',
    observed:
      'The current resolver reports one build item and one mesh instance for each package. At +Z and 45°, translation keeps the 200 mm² base downward while rotation makes the approximately 215.41 mm² sloped face downward.',
    settings:
      'Load each package locally in the 3MF Overhang Checker with +Z up and a 45° threshold.',
    limitations:
      'The combined-scene checker does not interpret support settings, colour or private extension semantics.',
    guide: GuideRouteUrl.Route3dPrintOverhangsAndSupportsGuide,
    tools: ['/3mf-overhang-checker', '/3mf-viewer'],
    provenance:
      'Original InspectMesh 3MF controls generated 18 October 2026; no physical print test.',
  },
  ...splitAssemblyExamples,
  {
    group: 'Export fidelity / release',
    settings:
      'Use millimetres and original coordinates. Loading is local and replaces only after your explicit action; no server analysis is submitted.',
    limitations:
      'Generated software geometry; no CAD export, physical fit or whole-surface equivalence is certified.',
    provenance:
      'Original InspectMesh controls and actual local-function observations, 26 October 2026. Settings, hashes and independent checks are retained in /examples/export-fidelity/observations.json.',
    id: 'revision-baselines',
    name: 'Revision baselines: unchanged and widened',
    question:
      'Can different triangles describe the same surface, and can an outside face really move?',
    files: [
      {
        path: '/examples/export-fidelity/baseline-original.stl',
        name: 'baseline-original.stl',
        bytes: 684,
        label: 'Before: 20 mm cube',
      },
      {
        path: '/examples/export-fidelity/baseline-retriangulated.stl',
        name: 'baseline-retriangulated.stl',
        bytes: 684,
        label: 'After: unchanged surface, new face diagonal',
      },
      {
        path: '/examples/export-fidelity/baseline-widened.stl',
        name: 'baseline-widened.stl',
        bytes: 684,
        label: 'After: width becomes 24 mm',
      },
    ],
    preview: '/examples/export-fidelity/revision-baselines.svg',
    alt: 'Projected faces show a 20 mm square with its original and changed diagonal, followed by a 24 mm wide face.',
    known:
      'The existing cube factory supplies a 20 mm cube, an unchanged face retriangulation and a deliberate 24 mm width revision.',
    observed:
      'Existing comparison regressions retain near-zero unchanged surface samples and the known 4 mm outside-face displacement. This is local software evidence.',
    guide: GuideRouteUrl.RouteHowToCompareStlRevisions,
    tools: ['/stl-compare'],
  },
  {
    group: 'Export fidelity / release',
    settings:
      'Use millimetres and original coordinates. Loading is local and replaces only after your explicit action; no server analysis is submitted.',
    limitations:
      'Generated software geometry; no CAD export, physical fit or whole-surface equivalence is certified.',
    provenance:
      'Original InspectMesh controls and actual local-function observations, 26 October 2026. Settings, hashes and independent checks are retained in /examples/export-fidelity/observations.json.',
    id: 'changed-square-hole',
    name: 'Same bounds and count, changed square opening',
    question:
      'Does the required opening survive when outside dimensions and triangle count stay unchanged?',
    files: [
      {
        path: '/examples/export-fidelity/square-hole-8mm.stl',
        name: 'square-hole-8mm.stl',
        bytes: 1684,
        label: 'Before: 8 mm square opening',
      },
      {
        path: '/examples/export-fidelity/square-hole-6mm.stl',
        name: 'square-hole-6mm.stl',
        bytes: 1684,
        label: 'After: 6 mm square opening',
      },
    ],
    preview: '/examples/export-fidelity/changed-hole.svg',
    alt: 'Top views at one scale show the same 40 by 30 mm exterior and square openings of 8 versus 6 mm.',
    known:
      'Both closed generated tubes span 40 × 30 × 10 mm and contain 32 triangles. Analytical volumes are 11,360 and 11,640 mm³.',
    observed:
      'Independent reopening confirms bounds, incidence, winding and volume. Existing two-way comparison at 0.1 mm reports 392 forward and 364 reverse samples above tolerance, out of 5,000 each.',
    guide: GuideRouteUrl.RouteHowToCompareStlRevisions,
    tools: ['/stl-compare', '/stl-viewer'],
  },
  {
    group: 'Export fidelity / release',
    settings:
      'Use millimetres and original coordinates. Loading is local and replaces only after your explicit action; no server analysis is submitted.',
    limitations:
      'Generated software geometry; no CAD export, physical fit or whole-surface equivalence is certified.',
    provenance:
      'Original InspectMesh controls and actual local-function observations, 26 October 2026. Settings, hashes and independent checks are retained in /examples/export-fidelity/observations.json.',
    id: 'curve-approximation',
    name: 'Source curves: 24 versus 72 facets',
    question:
      'Can identical outer bounds hide a different curve approximation?',
    files: [
      {
        path: '/examples/export-fidelity/circle-24-segments.stl',
        name: 'circle-24-segments.stl',
        bytes: 4884,
        label: '24 polygon segments',
      },
      {
        path: '/examples/export-fidelity/circle-72-segments.stl',
        name: 'circle-72-segments.stl',
        bytes: 14484,
        label: '72 polygon segments',
      },
    ],
    preview: '/examples/export-fidelity/curve-segments.svg',
    alt: 'Polygon cross-sections with 24 and 72 edges against separate dashed analytical circles, at one scale.',
    known:
      'Circumradius 10 mm, height 20 mm, cap fans and side quads: 96 and 288 triangles. Both include axis extremes and span 20 × 20 × 20 mm.',
    observed:
      'Serialized files reopen with their designed closed edge incidence and bounds. Analytical ideal-circle sagitta is about 0.08555 versus 0.00952 mm; this is not a measured CAD-export setting.',
    guide: GuideRouteUrl.RouteStlResolutionChordHeightExplained,
    tools: ['/stl-viewer', '/stl-compare'],
  },
  {
    group: 'Export fidelity / release',
    settings:
      'Use Try example kit in the collection tool, or download all three files and select them deliberately. Compare the intended inventory manually.',
    limitations:
      'The checker cannot know a required file is absent. The cover remains unresolved; slicer and physical tests were not performed. No release approval or licence entitlement is inferred.',
    provenance:
      'Existing InspectMesh kit generator and collection-report functions replayed locally. Actual reports and release record: /examples/export-fidelity/kit-release-record.json.',
    id: 'release-kit-record',
    name: 'Three-file release kit with unresolved cover',
    question:
      'Does the delivery inventory match the checked files, and what remains unresolved?',
    files: [
      {
        path: '/examples/export-fidelity/kit-base-r01.stl',
        name: 'kit-base-r01.stl',
        bytes: 684,
        label: 'One 60 × 40 × 4 mm base',
      },
      {
        path: '/examples/export-fidelity/kit-cover-review-r01.stl',
        name: 'kit-cover-review-r01.stl',
        bytes: 584,
        label: 'One deliberately open 60 × 40 × 2 mm cover',
      },
      {
        path: '/examples/export-fidelity/kit-spacer-r01.stl',
        name: 'kit-spacer-r01.stl',
        bytes: 684,
        label: 'One 8 × 8 × 12 mm spacer',
      },
    ],
    preview: '/examples/export-fidelity/kit-inventory.svg',
    alt: 'Three separate labelled box controls, with an open face on the cover and an explicit unresolved release decision.',
    known:
      'Exact bytes are generated by the existing collection kit action, with one of each intended file. These boxes are not a mechanically fitted assembly.',
    observed:
      'Local collection functions report 9,600 mm³ for the base, four cover boundary edges and unavailable cover volume, and 768 mm³ for the spacer. Printer fit is skipped without a profile.',
    guide: GuideRouteUrl.RouteCheckStlFilesBeforeSelling,
    tools: ['/batch-stl-checker'],
  },
];
/** Only registry IDs are accepted; unknown values never become fetch locations. */
export function findPublicExample(
  id: string,
  tool: string,
): PublicExample | undefined {
  return publicExamples.find(
    (example) => example.id === id && example.tools.includes(tool),
  );
}

/** Put known revision controls first without changing the ordering of other tool selectors. */
export function publicExampleChoices(tool: string): readonly PublicExample[] {
  const choices = publicExamples.filter((example) =>
    example.tools.includes(tool),
  );
  if (tool !== '/stl-compare') {
    return choices;
  }
  const preferred = [
    'revision-baselines',
    'changed-square-hole',
    'curve-approximation',
  ];
  const rank = (id: string) => {
    const index = preferred.indexOf(id);
    return index < 0 ? preferred.length : index;
  };
  return choices.sort((a, b) => rank(a.id) - rank(b.id));
}
