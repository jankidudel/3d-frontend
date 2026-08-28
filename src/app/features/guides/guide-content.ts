import { PublicRouteUrl } from '../../core/seo/public-routes';

export interface GuideSection {
  readonly heading: string;
  readonly paragraphs?: readonly string[];
  readonly bullets?: readonly string[];
  readonly subsections?: readonly {
    readonly heading: string;
    readonly paragraphs: readonly string[];
  }[];
}

export interface Guide {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly intro: readonly string[];
  readonly sections: readonly GuideSection[];
  readonly faqs: readonly {
    readonly question: string;
    readonly answer: string;
  }[];
}

export const guides = {
  'non-manifold': {
    title: 'How to Fix Non-Manifold STL Files for 3D Printing | InspectMesh',
    description:
      'Learn what non-manifold STL geometry means, how to find open edges and other mesh problems, and practical ways to repair a model before 3D printing.',
    path: PublicRouteUrl.FixNonManifoldStlGuide,
    eyebrow: 'STL repair guide',
    heading: 'How to Fix Non-Manifold STL Files for 3D Printing',
    intro: [
      'An STL can look perfectly normal on screen and still fail when a slicer tries to turn it into a physical object. A common reason is <strong>non-manifold geometry</strong>: the mesh does not describe one clean, unambiguous surface with a usable inside and outside.',
      'For most 3D-printing models, each edge should join exactly two triangles. An edge used by only one triangle is an open edge - a hole in the surface. An edge shared by three or more triangles is non-manifold. Other problems, such as duplicate faces, zero-area triangles and inconsistent face direction, can create similar slicing issues.',
    ],
    sections: [
      {
        heading: 'First, check what is actually wrong',
        paragraphs: [
          `Do not start repairing blindly. Upload the file to the <a href="${PublicRouteUrl.QualityCheck}">STL Quality Checker</a> to see the counts for open edges, non-manifold edges, duplicate triangles, degenerate triangles and orientation issues. If the main question is whether the model forms a closed surface, use the <a href="${PublicRouteUrl.WatertightChecker}">STL Watertight Checker</a>. The <a href="${PublicRouteUrl.ManifoldChecker}">STL Manifold Checker</a> gives a more focused topology report.`,
          'The report tells you whether a repair is likely to be simple. A few open edges in an otherwise clean model may be a small missing face. Thousands of non-manifold edges can indicate overlapping parts, a poor export or scan data that needs more substantial clean-up.',
        ],
      },
      {
        heading: 'Common causes of non-manifold STL geometry',
        bullets: [
          '<strong>Holes or missing faces.</strong> An unsealed opening leaves boundary edges with no matching triangle on the other side.',
          '<strong>Overlapping solids.</strong> Two objects may visually intersect without being combined into one solid. A boolean union is usually needed before export.',
          '<strong>Internal faces.</strong> Faces trapped inside an object can confuse the definition of the printable volume.',
          '<strong>Failed boolean operations.</strong> Nearly touching or coplanar shapes can create tiny fragments, duplicate faces or ambiguous edges.',
          '<strong>Bad mesh edits or exports.</strong> Deleting a face, merging vertices incorrectly or exporting a CAD model with unsuitable tessellation can introduce defects.',
        ],
      },
      {
        heading: 'Repair options',
        subsections: [
          {
            heading: 'Blender',
            paragraphs: [
              'Import the STL, enter <strong>Edit Mode</strong>, then use <strong>Select &gt; Select All by Trait &gt; Non-Manifold</strong> to locate suspect geometry. Depending on the issue, fill a simple hole, remove internal faces, merge nearby duplicate vertices carefully, or perform a proper boolean union on overlapping objects. Recalculate normals after the surface is clean, then export a new STL.',
            ],
          },
          {
            heading: 'Microsoft 3D Builder',
            paragraphs: [
              'For a straightforward consumer-printing model, open the file in 3D Builder. When it offers to repair the model, review the result and save it as a new file. Re-check the saved STL afterwards; automated repair can change small details, so it should not be the only verification step for a precise part.',
            ],
          },
          {
            heading: 'Your slicer',
            paragraphs: [
              'Some slicers can repair simple problems during import. This can be convenient, but treat it as a temporary fix rather than evidence that the original file is healthy. If the model is valuable or repeatedly printed, save a repaired source file and check it again before relying on it.',
            ],
          },
        ],
      },
      {
        heading: 'Re-check after repair',
        paragraphs: [
          `Export or save the repaired model under a new filename, then run the <a href="${PublicRouteUrl.QualityCheck}">STL Quality Checker</a> again. Ideally, open-edge and non-manifold-edge counts should be zero for a single closed printable solid. Separate shells are not automatically wrong - for example, a print plate can contain several independent parts - but each part should still be a valid surface where appropriate.`,
        ],
      },
    ],
    faqs: [
      {
        question: 'Can a non-manifold STL still print?',
        answer:
          'Sometimes. Modern slicers may work around small defects, but the result can have missing layers, unexpected internal structure or other problems. Checking before printing is safer.',
      },
      {
        question: 'Does non-manifold always mean there is a visible hole?',
        answer:
          'No. Internal faces, overlapping solids and several faces sharing the same edge can be difficult to see in a normal shaded view.',
      },
      {
        question: 'Can InspectMesh repair my STL?',
        answer:
          'No. InspectMesh identifies mesh problems so you can choose an appropriate repair workflow and verify the repaired result.',
      },
    ],
  },
  watertight: {
    title: 'How to Tell If an STL File Is Watertight | InspectMesh',
    description:
      'Learn how to check whether an STL model is watertight, why open edges and holes matter for 3D printing, and what to do when a mesh is not closed.',
    path: PublicRouteUrl.WatertightStlGuide,
    eyebrow: 'STL topology guide',
    heading: 'How to Tell If an STL File Is Watertight',
    intro: [
      'A watertight STL describes a completely closed surface. Imagine filling the model with water: if the surface has no holes, the water stays inside. For a single solid intended for 3D printing, that closed boundary gives the slicer a clear definition of what is inside the object and what is outside.',
      'An STL is not watertight when it has <strong>open edges</strong>. An open edge belongs to only one triangle instead of joining to a neighbouring triangle. A model may have one obvious hole, many tiny gaps, or disconnected patches that are hard to spot in a normal 3D preview.',
    ],
    sections: [
      {
        heading: 'The quickest way to check',
        paragraphs: [
          `Use the free <a href="${PublicRouteUrl.WatertightChecker}">STL Watertight Checker</a>. It analyses the mesh and reports whether it finds open edges, together with the number of separate shells. For a broader report that also checks duplicates, degenerate triangles, non-manifold edges and face orientation, use the <a href="${PublicRouteUrl.QualityCheck}">STL Quality Checker</a>.`,
          'A zero open-edge count is a strong indication that a mesh is closed. It is still useful to look at the rest of the report: a closed mesh can have other geometry issues, including non-manifold edges or inconsistent orientation.',
        ],
      },
      {
        heading: 'Why watertightness matters for 3D printing',
        paragraphs: [
          'A slicer must decide which regions receive material. If a model has holes or an ambiguous surface, it may create missing walls, unexpected infill, gaps in layers or an incomplete print. Some slicers repair simple gaps automatically, but different slicers can make different assumptions. A validated source file is more predictable.',
          'Watertightness is especially important for models that are meant to be one solid piece: figurines, enclosures, functional brackets, containers and scan-derived models. A file containing several intentionally separate printable parts can still be acceptable, but each part should be assessed separately.',
        ],
      },
      {
        heading: 'Visual checks are helpful, but not enough',
        paragraphs: [
          `Opening the file in the <a href="${PublicRouteUrl.Viewer}">STL Viewer</a> is useful for inspecting its shape and dimensions, but a viewer alone cannot reliably reveal every tiny hole or internal topology issue. A mesh can look closed from the outside while still having open edges deep inside or beneath overlapping faces.`,
          'Use visual inspection alongside a topology check. If the checker reports open edges, repair the file in your modelling software or a repair utility, save a new version, then run the check again.',
        ],
      },
      {
        heading: 'What to do when an STL is not watertight',
        paragraphs: [
          `Start by finding the cause. A small missing face may be simple to fill. Intersecting parts may need a boolean union. A 3D scan can need hole filling and surface reconstruction. The guide <a href="${PublicRouteUrl.FixNonManifoldStlGuide}">How to Fix Non-Manifold STL Files</a> explains common repair approaches and why some defects are not visible at first glance.`,
          'Always keep the original file and verify the repaired copy. Automated repair can be useful, but it can also remove or reshape fine details.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is a watertight STL always printable?',
        answer:
          'No. Watertightness checks the surface closure. Wall thickness, scale, overhangs, support, material and printer settings can still affect whether a print succeeds.',
      },
      {
        question: 'Are separate shells always a problem?',
        answer:
          'No. A file can intentionally contain several separate parts. The important question is whether each intended solid has a clean, closed surface.',
      },
      {
        question: 'Is manifold the same as watertight?',
        answer:
          'They are related but not identical. Watertightness focuses on open boundaries. Manifold analysis also considers whether edges and surfaces join in an unambiguous way.',
      },
    ],
  },
  units: {
    title: 'Why STL Files Have No Units (and How to Scale Them) | InspectMesh',
    description:
      'STL files store shape coordinates but not millimetres or inches. Learn why scale problems happen and how to check and correct STL dimensions before printing.',
    path: PublicRouteUrl.StlUnitsGuide,
    eyebrow: 'STL scale guide',
    heading: 'Why STL Files Have No Units',
    intro: [
      'An STL file stores triangles and coordinate values, but it does <strong>not</strong> store whether those values mean millimetres, centimetres or inches. A coordinate span of <code>100</code> is simply <code>100</code> units. The printer software decides what that unit means.',
      'This is why the same STL can appear at the expected size in one program and 25.4 times too small or too large in another. The model has not changed; the software is interpreting its unitless coordinates differently.',
    ],
    sections: [
      {
        heading: "How to check an STL's size",
        paragraphs: [
          `Upload it to the <a href="${PublicRouteUrl.DimensionsChecker}">STL Dimensions Checker</a>. It reports the model's width, height and depth and lets you view the values as millimetres, centimetres or inches. You can also calculate proportional scaling and compare the model with a printer build volume.`,
          `If you only need a quick visual look at the geometry and raw bounds, the <a href="${PublicRouteUrl.Viewer}">STL Viewer</a> shows dimensions locally in your browser. Remember that neither tool can know the original author's intended unit from the STL itself.`,
        ],
      },
      {
        heading: 'Common scaling mistakes',
        subsections: [
          {
            heading: 'Millimetres interpreted as inches',
            paragraphs: [
              'Most consumer 3D-printing workflows use millimetres. If a model created in millimetres is interpreted as inches, it becomes 25.4 times larger than intended.',
            ],
          },
          {
            heading: 'Inches interpreted as millimetres',
            paragraphs: [
              'The reverse is also common. A part designed as 4 inches wide may appear only 4 mm wide when imported into a millimetre-first slicer. Multiply by 25.4 to convert inches to millimetres.',
            ],
          },
          {
            heading: 'Centimetres interpreted as millimetres',
            paragraphs: [
              'A model made in centimetres can appear ten times too small when a slicer assumes millimetres. Multiply by 10 to convert centimetres to millimetres.',
            ],
          },
        ],
      },
      {
        heading: 'How to correct the scale',
        paragraphs: [
          'First establish the intended real-world size. A known dimension from the original design, product specification or creator is better than guessing from the file name. Then set the correct size in your slicer or modelling program while keeping proportional scaling locked.',
          'For example, if a 50 mm part imports as 2 mm, the scale factor needed is <code>50 ÷ 2 = 25</code>. If an intended 4-inch part imports as 4 mm, the scale factor is <code>25.4</code>.',
          "After scaling, compare the dimensions with your printer's build volume and consider clearances, wall thickness and orientation. Correct outer dimensions do not by themselves guarantee that a part will fit or print correctly.",
        ],
      },
      {
        heading: 'Why 3MF handles this better',
        paragraphs: [
          `Unlike STL, 3MF can store a declared model unit. If your workflow supports it, 3MF can reduce ambiguity between modelling and slicing. InspectMesh's <a href="${PublicRouteUrl.ThreeMfQualityCheck}">3MF Quality Checker</a> reports the declared unit, and the <a href="${PublicRouteUrl.ThreeMfViewer}">3MF Viewer</a> lets you inspect the displayed model locally.`,
        ],
      },
    ],
    faqs: [
      {
        question: 'Can InspectMesh detect the intended STL unit automatically?',
        answer:
          'No. The STL format does not contain that information. The dimensions checker can show possible interpretations, but the intended size must come from the model source or a known measurement.',
      },
      {
        question: 'Should I always use millimetres for 3D printing?',
        answer:
          'Millimetres are the most common convention in consumer 3D-printing workflows. What matters most is using the same convention consistently from design to slicing.',
      },
      {
        question: 'Does scaling change triangle count?',
        answer:
          'No. Uniform scaling changes the size of the geometry, not the number of triangles. It does change area and volume.',
      },
    ],
  },
  triangles: {
    title:
      'STL Triangle Count Explained: File Size, Detail and Printing | InspectMesh',
    description:
      'Learn what STL triangle count means, how it affects file size and model detail, and when a high-poly STL can make slicing slower without improving a print.',
    path: PublicRouteUrl.StlTriangleCountGuide,
    eyebrow: 'STL mesh guide',
    heading: 'STL Triangle Count Explained',
    intro: [
      'Every STL model is made from flat triangular faces. The <strong>triangle count</strong> is the number of those faces. More triangles can approximate curves and small details more smoothly, but they also make the file larger and can slow down editing, viewing and slicing.',
      "There is no single ideal triangle count. The right level of detail depends on the model's physical size, the printer's resolution and the features you want to preserve.",
    ],
    sections: [
      {
        heading: "Check your model's triangle count",
        paragraphs: [
          `Use the <a href="${PublicRouteUrl.TriangleCounter}">STL Triangle Counter</a> to count faces and see a simple explanation of mesh complexity. The <a href="${PublicRouteUrl.Viewer}">STL Viewer</a> also shows the triangle count while you inspect the model in 3D. Use the <a href="${PublicRouteUrl.QualityCheck}">STL Quality Checker</a> if you also want to check whether the mesh has duplicates, degenerate triangles or topology problems.`,
        ],
      },
      {
        heading: 'More triangles are not always better',
        paragraphs: [
          'A low triangle count can make a curved surface look visibly faceted. A high triangle count can preserve smooth curvature, but after a point the added faces are smaller than the printer can reproduce. They increase file size and processing time without producing a visibly better print.',
          'For example, a large decorative sphere benefits from enough triangles to avoid obvious flat facets. A mechanical bracket with mostly straight planes does not benefit from millions of tiny triangles on otherwise flat faces. The practical goal is to keep the mesh detailed enough for the intended print, not to maximise its triangle count.',
        ],
      },
      {
        heading: 'Signs that an STL has too few triangles',
        bullets: [
          'Circular holes look polygonal rather than round.',
          'Curved surfaces show clear flat bands.',
          'Diagonal or organic shapes have visibly angular silhouettes.',
        ],
        paragraphs: [
          'If those facets would still be visible at the final printed size, re-export the original CAD model with a finer tessellation setting. Repeatedly converting an STL rarely adds real detail; it only changes the mesh approximation.',
        ],
      },
      {
        heading: 'Signs that an STL has too many triangles',
        bullets: [
          'The file is unusually large for a simple part.',
          'Opening, rotating or slicing the file is slow.',
          'A model has dense tiny triangles across flat surfaces.',
          'The slicer uses a lot of memory without a visible quality improvement.',
        ],
        paragraphs: [
          'Where possible, return to the original CAD, sculpt or modelling file and export with sensible quality settings. Mesh reduction can help, but test the result carefully around holes, thin features, text and curved surfaces.',
        ],
      },
      {
        heading: 'Triangle count and print quality',
        paragraphs: [
          `Triangle count is only one factor. No amount of mesh detail can overcome a coarse nozzle, large layer height, inaccurate calibration or unsuitable print orientation. Conversely, a modest triangle count can print beautifully when the geometry is well matched to the printer and the intended scale.`,
          `For a more complete pre-print check, combine triangle count with dimensions and mesh health: use the <a href="${PublicRouteUrl.DimensionsChecker}">STL Dimensions Checker</a> and the <a href="${PublicRouteUrl.QualityCheck}">STL Quality Checker</a>.`,
        ],
      },
    ],
    faqs: [
      {
        question: 'Does a larger STL file always have more detail?',
        answer:
          'Not necessarily. It may contain unnecessary triangles, duplicate geometry or other inefficient mesh data. Inspect the model at its intended print size.',
      },
      {
        question: 'Does reducing triangles make a model smaller?',
        answer:
          "It usually reduces file size, but it does not change the model's physical dimensions unless you also scale it.",
      },
      {
        question: 'Can very high triangle counts cause problems?',
        answer:
          'Yes. They can make browsers, modelling tools and slicers slower, particularly on less powerful hardware.',
      },
    ],
  },
} as const satisfies Record<string, Guide>;

export type GuideKey = keyof typeof guides;
