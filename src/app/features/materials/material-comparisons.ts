import { MaterialId } from './material-catalogue';
import { PublicRouteSegment } from '../../core/seo/public-routes';
import { MaterialComparisonSlug } from '../../core/seo/public-routes';

export type MaterialComparison = Readonly<{
  slug: string;
  materialAId: MaterialId;
  materialBId: MaterialId;
  summary: string;
  scenarioTitle: string;
  scenario: string;
  reversals: string;
  preparation: string;
  requirements: readonly Readonly<{ label: string; check: string }>[];
  chooseAWhen: readonly string[];
  chooseBWhen: readonly string[];
  lastReviewedAt: string;
}>;
const reviewed = '2026-10-09';
export const materialComparisons: readonly MaterialComparison[] = [
  {
    slug: MaterialComparisonSlug.PlaVsPetg,
    scenarioTitle: 'A cable holder needs stiffness before it needs toughness',
    scenario:
      'An indoor cable holder with a 30 mm arm and a 200 g cable bundle is a hypothetical design brief. Begin with PLA for a visual fit prototype; compare PETG if repeated knocks or bending matter. The 200 g input describes the job, not a safe load for either polymer. Print the intended layer direction and check deflection under the actual sustained load.',
    reversals:
      'A warmer mounting surface or persistent load reverses the low-heat prototype choice. PETG can also creep; neither family label establishes long-term load capacity.',
    preparation:
      'Confirm room and mounting temperatures, arm section and layer direction before selecting an exact spool. PETG surface adhesion and stringing need their own profile rather than the PLA preset.',
    requirements: [
      {
        label: 'Load duration',
        check: 'Separate a short fit check from sustained cable weight.',
      },
      {
        label: 'Geometry',
        check:
          'Check arm deflection and root stress in the intended layer direction.',
      },
      {
        label: 'Temperature',
        check:
          'Measure the mounting surface; do not use nozzle temperature as a service limit.',
      },
    ],

    materialAId: MaterialId.Pla,
    materialBId: MaterialId.Petg,
    summary:
      'PLA is generally easier for stiff visual parts; PETG is commonly selected when tougher functional behaviour matters.',
    chooseAWhen: ['You prioritise easy, tidy prototypes.'],
    chooseBWhen: [
      'You need more impact tolerance for an indoor functional part.',
    ],
    lastReviewedAt: reviewed,
  },
  {
    slug: MaterialComparisonSlug.PlaVsAbs,
    scenarioTitle: 'A fit prototype and a warm cover ask different questions',
    scenario:
      'Suppose a 60 x 40 mm cover is first used to confirm screw positions at room temperature. PLA can answer that fit question with less warping preparation. If the final cover sits next to a warm motor, record the measured operating temperature and duration, then obtain exact ABS grade data before choosing it. The example contains no measured heat or load result.',
    reversals:
      'A cover that only needs a visual fit check does not justify ABS preparation. A verified elevated-temperature requirement can rule out the initial PLA choice, but may also exceed the proposed ABS formulation.',
    preparation:
      'ABS needs documented enclosure, adhesion and ventilation arrangements. Keep the fit prototype separate from the production qualification part; check dimensions after cooling.',
    requirements: [
      {
        label: 'Use phase',
        check: 'Distinguish a disposable prototype from the service part.',
      },
      {
        label: 'Heat evidence',
        check:
          'Compare exact grade data under the relevant load and exposure duration.',
      },
      {
        label: 'Print environment',
        check: 'Budget for warp control and manufacturer safety instructions.',
      },
    ],

    materialAId: MaterialId.Pla,
    materialBId: MaterialId.Abs,
    summary:
      'PLA favours straightforward low-heat printing, while ABS brings higher heat tolerance with much stricter setup needs.',
    chooseAWhen: ['The part stays indoors and away from heat.'],
    chooseBWhen: [
      'Heat resistance justifies enclosure and ventilation preparation.',
    ],
    lastReviewedAt: reviewed,
  },
  {
    slug: MaterialComparisonSlug.PetgVsAbs,
    scenarioTitle:
      'Choose the print environment only after defining the service temperature',
    scenario:
      'A 100 mm indoor instrument bracket may favour PETG when straightforward functional printing is the priority. If it must operate near a heater, use a measured temperature history and grade-specific data to evaluate ABS instead. Compare cooled hole spacing and loaded deflection on the final geometry; the length is only an illustrative input.',
    reversals:
      'Room-temperature use can remove the main reason to accept ABS warping burden. An enclosure alone does not establish that ABS is suitable, and impact or creep requirements can override a simple heat comparison.',
    preparation:
      'Confirm the PETG bed surface and separation layer. For ABS, control ambient conditions and follow safety guidance; remeasure screw spacing rather than assuming the CAD dimensions survived printing.',
    requirements: [
      {
        label: 'Service environment',
        check: 'Record peak temperature and continuous duration separately.',
      },
      {
        label: 'Assembly',
        check: 'Measure cooled hole spacing and mating clearance.',
      },
      {
        label: 'Equipment',
        check:
          'Verify the exact printer and spool profile, not only hotend capacity.',
      },
    ],

    materialAId: MaterialId.Petg,
    materialBId: MaterialId.Abs,
    summary:
      'PETG is often the simpler functional option; ABS can be preferable where higher heat resistance is essential.',
    chooseAWhen: ['You want a functional part without an enclosure.'],
    chooseBWhen: ['You can manage warp control for higher heat tolerance.'],
    lastReviewedAt: reviewed,
  },
  {
    slug: MaterialComparisonSlug.AbsVsAsa,
    scenarioTitle:
      'Sunlight exposure is a separate requirement from indoor toughness',
    scenario:
      'Consider two 80 mm sensor brackets: one inside a cabinet and one on its exterior. The indoor bracket may justify an existing ABS workflow. For the exposed bracket, Prusa describes ASA as UV-resistant, making it a candidate to investigate. Record expected sun, colour, temperature and water exposure before accepting a specific formulation.',
    reversals:
      'A shaded, replaceable part can make an existing ABS supply practical. Outdoor exposure does not guarantee ASA lifetime; seal design, fasteners and grade data can determine the outcome more than the polymer family.',
    preparation:
      'Both require attention to warping and a suitable environment. Check the exact enclosure and bed instructions, then inspect mounting dimensions and finish after cooling.',
    requirements: [
      {
        label: 'Exposure',
        check: 'Separate sunlight from rain sealing and sustained heat.',
      },
      {
        label: 'Finish',
        check: 'Colour and coating can alter the exposure conditions.',
      },
      {
        label: 'Lifetime',
        check:
          'Require application evidence; a family description is not an outdoor warranty.',
      },
    ],

    materialAId: MaterialId.Abs,
    materialBId: MaterialId.Asa,
    summary:
      'Both need similar care, but ASA is commonly considered when UV and weather exposure matter.',
    chooseAWhen: ['The part is protected from prolonged sun.'],
    chooseBWhen: ['The part will spend time outdoors.'],
    lastReviewedAt: reviewed,
  },
  {
    slug: MaterialComparisonSlug.PetgVsAsa,
    scenarioTitle:
      'An outdoor cover needs more than a weather-resistance label',
    scenario:
      'A hypothetical 120 x 80 mm outdoor sensor cover has four mounts and a cable opening. PETG may serve a sheltered prototype; ASA is worth evaluating for sustained sunlight using exact product guidance. Check mounting loads, actual surface heat and a separate gasket or drainage strategy. Neither material selection nor a closed mesh establishes water sealing.',
    reversals:
      'A shaded temporary cover may not justify ASA enclosure preparation. A sun-heated, loaded cover may require a different grade or redesign even if ASA is shortlisted. Validate the chosen colour and formulation under the actual exposure.',
    preparation:
      'Use a PETG-specific surface/profile for the prototype. For ASA, verify enclosure, ventilation and warp control; compare cooled mount positions with the mating enclosure.',
    requirements: [
      {
        label: 'Sunlight',
        check: 'Review exact UV evidence and colour, not only the family name.',
      },
      {
        label: 'Water',
        check: 'Design and test cable seals, joints and drainage separately.',
      },
      {
        label: 'Mounting',
        check:
          'Check creep and fastener load at the expected surface temperature.',
      },
    ],

    materialAId: MaterialId.Petg,
    materialBId: MaterialId.Asa,
    summary:
      'PETG usually reduces setup burden; ASA is the more specialised option for weather-exposed parts.',
    chooseAWhen: ['The part is primarily indoor or lightly exposed.'],
    chooseBWhen: ['UV and weather resistance are central requirements.'],
    lastReviewedAt: reviewed,
  },
  {
    slug: MaterialComparisonSlug.PlaVsTpu,
    scenarioTitle:
      'A locating plate and a bumper have opposite deformation goals',
    scenario:
      'Imagine a 40 mm locating plate that must position an assembly, plus a 3 mm protective bumper. PLA is the rigid prototype candidate; TPU is the candidate when the bumper must compress. Measure both unloaded dimensions and deformation under the intended force. A 3 mm CAD thickness does not establish impact absorption.',
    reversals:
      'If the locating plate must flex for insertion, geometry and a defined TPU hardness may change the choice. If the bumper must hold precise alignment under load, compliance can be a disadvantage. Do not treat all TPU hardness grades as interchangeable.',
    preparation:
      'Use a supported flexible-filament feed path and exact hardness/profile. Plan support removal and bridging for TPU; check PLA orientation and layer adhesion for the rigid feature.',
    requirements: [
      {
        label: 'Function',
        check: 'Define whether movement is required or unacceptable.',
      },
      {
        label: 'Hardness',
        check:
          'Specify a TPU grade and Shore scale before comparing compression.',
      },
      {
        label: 'Feed path',
        check:
          'Verify extrusion and accessory support for the chosen flexible spool.',
      },
    ],

    materialAId: MaterialId.Pla,
    materialBId: MaterialId.Tpu,
    summary:
      'PLA is rigid and easy to print; TPU is chosen for compliance and impact absorption.',
    chooseAWhen: ['The part must stay rigid.'],
    chooseBWhen: ['The part needs bend, grip or damping.'],
    lastReviewedAt: reviewed,
  },
  {
    slug: MaterialComparisonSlug.PetgVsTpu,
    scenarioTitle: 'Separate a firm housing from the compressible insert',
    scenario:
      'A hypothetical 70 mm housing holds a removable 2 mm cushioning insert. PETG is a candidate for the firm shell, while TPU is a candidate for the insert. Check insertion clearance in the shell and compression/rebound of the insert at the actual load. The dimensions are design inputs, not measured fit tolerances.',
    reversals:
      'A single-piece flexible case can favour TPU when alignment is not critical. A tight locating surface can favour the firmer design; thin PETG geometry may flex too, so evaluate shape as well as polymer.',
    preparation:
      'PETG supports and bed adhesion need a tuned profile. TPU requires hardness-specific feed and support preparation; difficult support removal can make a different part orientation or split design preferable.',
    requirements: [
      {
        label: 'Alignment',
        check: 'Set the allowable movement of the housing features.',
      },
      {
        label: 'Compression',
        check: 'Define loaded thickness and recovery, not only CAD size.',
      },
      {
        label: 'Supports',
        check:
          'Check whether supports can be removed without damaging a flexible cavity.',
      },
    ],

    materialAId: MaterialId.Petg,
    materialBId: MaterialId.Tpu,
    summary:
      'PETG suits semi-rigid functional parts, while TPU trades rigidity for elasticity.',
    chooseAWhen: ['You need a firm functional shell.'],
    chooseBWhen: ['You need a compliant or protective part.'],
    lastReviewedAt: reviewed,
  },
  {
    slug: MaterialComparisonSlug.PetgVsNylon,
    scenarioTitle: 'A sliding guide requires moisture and wear evidence',
    scenario:
      'For a 50 mm sliding guide, PETG can be a candidate for an accessible fit prototype. A nylon grade becomes worth evaluating when repeated sliding, wear or toughness dominate. Record the mating surface and humidity conditions; measure the guide after printing and after conditioning for service. No wear cycle count is claimed here.',
    reversals:
      'A low-duty dry indoor guide can favour PETG simplicity. A humid precision fit can rule out an unqualified nylon choice because conditioning changes dimensions. PA6, PA12 and fibre-filled products need separate evidence.',
    preparation:
      'Follow exact nylon drying and storage instructions and confirm the bed/nozzle arrangement. Reinforced nylon can need abrasion-resistant hardware; do not transfer an unfilled spool profile automatically.',
    requirements: [
      {
        label: 'Wear',
        check: 'Use the real mating surface and movement requirements.',
      },
      {
        label: 'Humidity',
        check: 'Specify service conditioning before measuring fit.',
      },
      {
        label: 'Grade',
        check:
          'Compare PA chemistry and reinforcement rather than a generic nylon ranking.',
      },
    ],

    materialAId: MaterialId.Petg,
    materialBId: MaterialId.Nylon,
    summary:
      'PETG is generally easier to prepare; nylon is a tougher engineering family with much higher moisture sensitivity.',
    chooseAWhen: ['You value accessible general-purpose printing.'],
    chooseBWhen: ['Wear and toughness justify drying discipline.'],
    lastReviewedAt: reviewed,
  },
  {
    slug: MaterialComparisonSlug.NylonVsPolycarbonate,
    scenarioTitle: 'An engineering cover needs a grade-level qualification',
    scenario:
      'A hypothetical 90 mm protective cover may require toughness, heat stability and accurate mounts. Nylon and PC are candidate families; compare exact datasheets at the operating temperature, moisture state and load. Print a dimensional coupon and final mounting geometry before choosing. Neither a family label nor a coupon certifies the assembled cover.',
    reversals:
      'A moisture-sensitive fit may change the nylon shortlist. A printer unable to hold the documented PC environment can remove PC from consideration even if its datasheet looks attractive. Blends and reinforced grades can reverse broad comparisons.',
    preparation:
      'Both need product-specific thermal, surface and drying preparation. Verify printer material documentation and remeasure cooled/conditioned dimensions; do not infer support from a 300 C hotend alone.',
    requirements: [
      {
        label: 'Temperature',
        check: 'Compare loaded service data, not extrusion temperatures.',
      },
      {
        label: 'Moisture',
        check:
          'Define the conditioning state used for fit and mechanical data.',
      },
      {
        label: 'Formulation',
        check: 'Distinguish nylon chemistry, PC blends and filled grades.',
      },
    ],

    materialAId: MaterialId.Nylon,
    materialBId: MaterialId.Pc,
    summary:
      'Nylon prioritises tough, wear-capable parts while PC raises heat resistance and printer demands.',
    chooseAWhen: ['You need toughness and can control moisture.'],
    chooseBWhen: ['High heat resistance is the deciding factor.'],
    lastReviewedAt: reviewed,
  },
  {
    slug: MaterialComparisonSlug.PolypropyleneVsPetg,
    scenarioTitle:
      'A hinged lid and a rigid box should not share one selection rule',
    scenario:
      'For a hypothetical 1 mm hinge strip on a 60 mm lid, PP is a candidate when repeated flexing is the design goal. PETG is the candidate for a firmer general-purpose box. Specify the bend radius and required cycles, then test the exact printed orientation. The 1 mm input is not a proven living-hinge specification.',
    reversals:
      'A lid that does not need an integral hinge may favour PETG and a mechanical joint. Chemical contact can override either choice: obtain data for the chemical, concentration, temperature and exposure duration. No blanket resistance certification follows from choosing PP.',
    preparation:
      'Prusa documents poor PP adhesion on standard PEI and recommends a suitable PP surface. Check warp control and the exact spool profile; use a PETG-specific surface/separation routine for the alternative.',
    requirements: [
      {
        label: 'Hinge',
        check: 'Define bend radius, orientation and cycle requirement.',
      },
      {
        label: 'Chemicals',
        check: 'Check exact exposure and formulation evidence.',
      },
      {
        label: 'Bed surface',
        check:
          'Confirm PP-specific adhesion before committing to the one-piece design.',
      },
    ],

    materialAId: MaterialId.Pp,
    materialBId: MaterialId.Petg,
    summary:
      'PP is specialised for lightweight, flexible and chemically resistant uses; PETG is usually the more broadly approachable choice.',
    chooseAWhen: [
      'You need PP-specific chemical resistance or living-hinge behaviour.',
    ],
    chooseBWhen: [
      'You need a general functional filament with easier adhesion.',
    ],
    lastReviewedAt: reviewed,
  },
];
export const materialComparisonPaths = materialComparisons.map(
  (comparison) =>
    `${PublicRouteSegment.MaterialComparisons}/${comparison.slug}`,
);
export const materialComparisonsBySlug = new Map(
  materialComparisons.map((comparison) => [comparison.slug, comparison]),
);
