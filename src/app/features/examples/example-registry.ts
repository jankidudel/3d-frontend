export interface PublicExample {
  readonly id: string;
  readonly name: string;
  readonly group: string;
  readonly question: string;
  readonly files: readonly {
    readonly path: string;
    readonly name: string;
    readonly bytes: number;
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
export const publicExamples: readonly PublicExample[] = [
  {
    id: 'units-scale',
    name: 'Size and units',
    group: 'Size / units',
    question:
      'What changes when 20 coordinates mean inches, or are scaled to 150%?',
    files: [
      {
        path: '/examples/english-market-batch/closed-20mm-cube.stl',
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
    guide: '/why-stl-files-have-no-units',
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
        path: '/examples/english-market-batch/closed-20mm-cube.stl',
        name: 'closed-20mm-cube.stl',
        bytes: 684,
      },
      {
        path: '/examples/english-market-batch/open-face-cube.stl',
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
    guide: '/how-to-fix-holes-in-an-stl-file',
    tools: ['/stl-viewer', '/stl-print-preflight'],
    provenance:
      'Original InspectMesh generated geometry; software inspection controls, no physical print test.',
  },
  {
    id: 'duplicate-winding',
    name: 'Duplicate faces and winding',
    group: 'Boundaries / topology',
    question:
      'Can edge checks distinguish a duplicate from a reversed triangle?',
    files: [
      {
        path: '/examples/english-market-batch/closed-20mm-cube.stl',
        name: 'closed-20mm-cube.stl',
        bytes: 684,
      },
      {
        path: '/examples/cad-export/duplicate-face-cube.stl',
        name: 'duplicate-face-cube.stl',
        bytes: 734,
      },
      {
        path: '/examples/diagnosis/reversed-winding-cube.stl',
        name: 'reversed-winding-cube.stl',
        bytes: 684,
      },
      {
        path: '/examples/diagnosis/stored-normal-cube.stl',
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
    guide: '/how-to-fix-flipped-normals-in-an-stl-file',
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
        path: '/examples/diagnosis/separated-cubes.stl',
        name: 'separated-cubes.stl',
        bytes: 1284,
      },
      {
        path: '/examples/collection-review/overlapping-cubes.stl',
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
    guide: '/how-to-fix-non-manifold-stl',
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
        path: '/examples/english-market-batch/thin-wall-bars.stl',
        name: 'thin-wall-bars.stl',
        bytes: 1884,
      },
      {
        path: '/examples/english-market-batch/thin-classic.gcode',
        name: 'thin-classic.gcode',
        bytes: 24245,
      },
      {
        path: '/examples/english-market-batch/thin-arachne.gcode',
        name: 'thin-arachne.gcode',
        bytes: 38901,
      },
    ],
    preview: '/examples/diagnosis/thin-features.svg',
    alt: 'Bar widths: 0.3 / 0.45 / 0.9 compared with Classic vs Arachne paths. Schematic, not an interface capture.',
    known:
      'Three bars are 0.3, 0.45 and 0.9 mm wide, 20 mm long and 10 mm high.',
    observed:
      'Retained PrusaSlicer 2.9.6 second-layer previews show four extrusion moves for Classic and six for Arachne, at three bar positions. These are software exports, not prints.',
    settings:
      'Preflight threshold: 1.2 mm. Slicer experiment: 0.4 mm nozzle, 0.2 mm layers, 0.45 mm width, two perimeters, zero infill, thin-wall option off.',
    limitations:
      'Review measured and unmeasured rays and the native slicer preview. Preview-only G-code must not be run on a printer. No universal minimum wall is established.',
    guide: '/3d-print-wall-thickness-guide',
    tools: ['/stl-viewer', '/stl-print-preflight'],
    provenance:
      'Original InspectMesh generated geometry; software inspection controls, no physical print test.',
  },
  {
    id: 'detail-loss',
    name: 'Detail after simplification',
    group: 'Thin features / detail',
    question: 'Does an unchanged bounding box preserve a small ridge?',
    files: [
      {
        path: '/examples/collection-review/detail-coupon.stl',
        name: 'detail-coupon.stl',
        bytes: 1284,
      },
      {
        path: '/examples/collection-review/detail-coupon-75.stl',
        name: 'detail-coupon-75.stl',
        bytes: 984,
      },
      {
        path: '/examples/collection-review/detail-coupon-50.stl',
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
    guide: '/how-to-reduce-stl-triangle-count',
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
        path: '/examples/collection-review/one-placed-cube.3mf',
        name: 'one-placed-cube.3mf',
        bytes: 973,
      },
      {
        path: '/examples/collection-review/two-placed-cubes.3mf',
        name: 'two-placed-cubes.3mf',
        bytes: 979,
      },
      {
        path: '/examples/english-market-batch/declared-inch-transformed.3mf',
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
      '3MF uses declared units. Conversion writes one combined binary STL with millimetre coordinates; select Convert explicitly.',
    limitations:
      'Keep the original package/project. STL loses declared units, build identity, colours, materials and project settings; unsupported extensions are not validated.',
    guide: '/3mf-missing-objects-after-import',
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
        path: '/examples/english-market-batch/printer-fit-250x210x180.stl',
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
    guide: '/how-to-check-if-a-3d-model-fits-your-printer',
    tools: ['/stl-viewer', '/stl-print-preflight'],
    provenance:
      'Original InspectMesh generated geometry; software inspection controls, no physical print test.',
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
