import { printerById, PrinterRecord } from './printer-catalogue';
import {
  PrinterComparisonSlug,
  PublicRoutePathValue as PublicRoutePath,
} from '../../core/seo/public-routes';

export interface CuratedComparison {
  readonly slug: string;
  readonly leftId: string;
  readonly rightId: string;
  readonly title: string;
  readonly description: string;
  readonly verdict: string;
  readonly chooseLeftIf: readonly string[];
  readonly chooseRightIf: readonly string[];
  readonly analysis: readonly string[];
  readonly faq: readonly {
    readonly question: string;
    readonly answer: string;
  }[];
}

const pairDecisions: Readonly<
  Record<string, Pick<CuratedComparison, 'verdict' | 'analysis' | 'faq'>>
> = {
  [PrinterComparisonSlug.BambuLabP1SVsP2S]: {
    verdict:
      'The P2S changes nozzle handling and monitoring, not the 256 mm build envelope. Compare the actual bundle cost with how often those workflow changes help your jobs.',
    analysis: [
      'An illustrative 230 x 230 mm plate footprint with an 8 mm brim allowance on every side occupies 246 x 246 mm. That is inside either 256 mm nominal square, before excluded regions. A wider footprint needs a layout change on both printers; monitoring features do not create bed area.',
      'Bambu describes the P2S quick-swap hotend, five-inch interface and 1080p monitoring in its launch account. Compare those features with your maintenance routine; automatic detection is not a measured failure-rate improvement here.',
    ],
    faq: [
      {
        question: 'Does the P2S give a P1S owner more nominal build space?',
        answer:
          'No. Both catalogue envelopes are 256 mm cubes. Evaluate the nozzle-handling and monitoring workflow against its cost separately from fit.',
      },
    ],
  },
  [PrinterComparisonSlug.BambuLabA1VsP2S]: {
    verdict:
      'The A1 and P2S share nominal capacity. Choose by supported material environment, filament-handling system and access needs rather than treating an enclosure as extra build space.',
    analysis: [
      'A 70 x 70 x 250 mm upright enclosure fits either nominal 256 mm cube and leaves only 6 mm of total height allowance. Choosing an enclosure changes the supported material environment, not that height limit. Review actual supports and top clearance in the slicer.',
      'The A1 uses AMS lite; the P2S Combo is described with AMS 2 Pro. Confirm the exact spool compatibility and bundle. A soft flexible spool and an automatic multi-filament workflow are separate compatibility questions.',
    ],
    faq: [
      {
        question: 'Will the enclosed P2S fit a taller part than the A1?',
        answer:
          'Their catalogue envelopes have the same nominal height. Choose by the exact material environment and accessory workflow after verifying the part and its supports.',
      },
    ],
  },
  [PrinterComparisonSlug.BambuLabA1VsA1Mini]: {
    verdict:
      'Choose the A1 when the intended parts exceed the Mini envelope. Choose the Mini when the smaller build and workspace suit the actual projects, after allowing for spool handling and bed motion.',
    analysis: [
      'A 160 mm cube is inside either nominal envelope. A 190 x 120 x 80 mm part exceeds the Mini 180 mm cube in every right-angle permutation because its longest span is 190 mm, while remaining inside the A1 cube. Those two jobs lead to different size decisions without changing scale.',
      'Both are open-frame models using AMS lite. A larger build is useful only if the intended material and job can use it; neither is an enclosure substitute. Compare the physical printer and accessory space separately from build volume.',
    ],
    faq: [
      {
        question:
          'When does the A1 Mini envelope actually change the decision?',
        answer:
          'When a required part exceeds 180 mm on an axis in every tested right-angle placement. A smaller part may fit both; then review workspace, material and accessories rather than choosing from maximum volume alone.',
      },
    ],
  },
  [PrinterComparisonSlug.BambuLabP1SVsA1]: {
    verdict:
      'Equal 256 mm capacity makes this a material-environment and accessory decision. An enclosed P1S can address a documented enclosure need; an A1 may suit a common-material workflow with direct access.',
    analysis: [
      "A 200 x 150 x 80 mm indoor cover is inside either nominal envelope. Geometry alone therefore does not resolve this pair: a documented enclosure requirement, service access and the intended filament system decide the next investigation. Do not turn a printer enclosure into a claim about the cover's heat resistance.",
      'Compare supported P-series AMS hardware with A1 AMS lite. Do not enclose the A1 as an assumed equivalent: follow its manufacturer guidance. For abrasive variants, check the installed nozzle and extrusion hardware even on the enclosed printer.',
    ],
    faq: [
      {
        question:
          'Does a P1S material capability listing qualify my exact spool?',
        answer:
          'No. The manufacturer family listing and the conservative selector answer different questions. Confirm formulation, installed nozzle and extrusion hardware, profile and filament-feeding support.',
      },
    ],
  },
  [PrinterComparisonSlug.BambuLabP1PVsP1S]: {
    verdict:
      'An existing P1P owner is deciding whether a supported enclosure upgrade is worth its full cost. A buyer comparing used P1P stock with a P1S must also account for condition and the dated end-of-sale notice.',
    analysis: [
      'A 200 x 200 x 100 mm part is inside either nominal 256 mm cube. Adding an enclosure does not enlarge that envelope. For an existing P1P, list the supported upgrade parts, their installation work and the actual material requirement before comparing that total with a P1S.',
      'The P1P end-of-sale announcement is historical evidence, not a live stock report. Obtain the current kit list, firmware instructions and total regional price before assuming a used machine plus upgrade matches a factory P1S.',
    ],
    faq: [
      {
        question:
          'Should an existing P1P owner compare only the enclosure price?',
        answer:
          'No. Include the complete supported kit, installation, cooling and firmware instructions, plus machine condition. Confirm current regional parts availability before treating an upgrade as equivalent to a factory model.',
      },
    ],
  },
  [PrinterComparisonSlug.BambuLabX1CarbonVsP2S]: {
    verdict:
      'These models share nominal capacity. Compare the X1 Carbon sensor workflow with the newer P2S hotend and monitoring workflow only where those features solve a defined task.',
    analysis: [
      'Two illustrative 110 x 80 mm footprints with a 12 mm gap occupy 232 x 80 mm before brims or purge structures. Both nominal 256 mm beds contain that rectangle, but the final sliced plate and material changes determine whether the job is practical. Sensors are a separate workflow comparison.',
      'Bambu\u2019s P2S launch describes its quick-swap hotend and camera updates and identifies lidar in the X1 family. These are manufacturer feature descriptions, not proof of superior first layers or reliability. Verify the exact X1 Carbon and P2S accessory bundles.',
    ],
    faq: [
      {
        question:
          'Can a sensor or maximum-speed specification establish lower job cost?',
        answer:
          'No. Compare the same complete sliced job, including material changes and purge, then measured operating inputs where available. This page does not supply hands-on failure-rate or throughput results.',
      },
    ],
  },
  [PrinterComparisonSlug.PrusaCoreOneVsBambuLabP1S]: {
    verdict:
      'The CORE One is narrower in nominal depth but taller: 250 x 220 x 270 mm versus a 256 mm cube. Choose based on the actual axis constraints, then compare service documentation and accessory requirements.',
    analysis: [
      'An illustrative 230 x 215 x 265 mm upright part is inside the CORE One 250 x 220 x 270 mm nominal envelope, with 5 mm total depth and height allowance. Its 265 mm span exceeds every axis of the P1S 256 mm cube under right-angle placement. Supports, brim and arbitrary-rotation alternatives still need slicer review.',
      'The linked Prusa documentation refers to the original CORE One; CORE One+ and later upgrades are different configurations. Verify the installed revision and multicolour compatibility. Compare Prusa service procedures with the exact P1S AMS bundle, without inferring a reliability winner.',
    ],
    faq: [
      {
        question: 'Which part makes the CORE One height distinction useful?',
        answer:
          'A narrow part that needs more than 256 mm of height but stays within its 250 x 220 mm footprint. Check usable clearances and the exact CORE One hardware revision rather than extrapolating from a different model.',
      },
    ],
  },
  [PrinterComparisonSlug.PrusaMk4SVsBambuLabA1]: {
    verdict:
      'The MK4S 250 x 210 x 220 mm envelope and A1 256 mm cube differ in depth and height. Match model size and the documented service/accessory workflow before comparing regional kit and assembled prices.',
    analysis: [
      'An illustrative 240 x 200 x 225 mm box fits the A1 256 mm cube but no tested right-angle placement in the MK4S 250 x 210 x 220 mm envelope. With 240 mm along its width, the remaining 225 mm span exceeds either available depth or height. This is a capacity decision, separate from serviceability and accessories.',
      'Both are open-frame printers. A Prusa kit entails assembly decisions that an assembled price does not capture. For multicolour compare exact MMU and AMS lite configurations and supported filaments; maximum temperatures do not establish equal spool support.',
    ],
    faq: [
      {
        question:
          'Can a right-angle rotation always rescue an over-height MK4S part?',
        answer:
          'No. A rotated long span must fit another available axis while the other spans fit their remaining axes. Check all three dimensions and include the final supports and brim.',
      },
    ],
  },
  [PrinterComparisonSlug.CrealityK1CVsBambuLabP1S]: {
    verdict:
      'The K1C 220 x 220 x 250 mm envelope is smaller than the P1S 256 mm cube. It is a candidate when that capacity is sufficient; a larger flat footprint can make the P1S relevant before any speed comparison.',
    analysis: [
      'A 225 mm cube exceeds the K1C 220 mm horizontal dimensions in every right-angle placement, but is inside the P1S 256 mm cube. In contrast, a 210 x 210 x 245 mm upright part is inside both nominal envelopes. Capacity only separates this pair for particular jobs.',
      'The K1C manufacturer page distinguishes carbon-filament hardware. Confirm exact K1C revision and nozzle, and check the P1S installed hardware before comparing abrasive materials. AMS support on P1S is an accessory decision, not a consequence of enclosure alone.',
    ],
    faq: [
      {
        question: 'Does an enclosed K1C imply the same job capacity as a P1S?',
        answer:
          'No. Enclosure describes the environment, while nominal build dimensions describe a different constraint. Check the required model and actual slicer reserves separately from material and nozzle preparation.',
      },
    ],
  },
  [PrinterComparisonSlug.ElegooNeptune4PlusVsBambuLabA1]: {
    verdict:
      'A 320 x 320 x 385 mm Neptune 4 Plus envelope can accommodate larger parts than the 256 mm A1 cube. The extra bed capacity needs a matching workspace and a material/process reason.',
    analysis: [
      'A 300 x 280 x 100 mm panel fits the Neptune nominal box in its original order but exceeds both A1 horizontal dimensions. Splitting the panel changes joints and assembly; shrinking it changes the product size.',
      'Both are open-frame platforms. Reserve bed-motion and service access space rather than treating the build dimensions as machine footprint. If the larger envelope is unnecessary, compare the documented setup and multicolour workflow without assuming quality from size.',
    ],
    faq: [
      {
        question: 'What must be checked before using this nominal fit?',
        answer:
          'Verify the final orientation, supports, brim and excluded bed regions in the exact slicer profile. The dimensions above are illustrative bounding boxes, not observed print results.',
      },
    ],
  },
};

const create = (comparison: CuratedComparison): CuratedComparison => ({
  ...comparison,
  ...pairDecisions[comparison.slug],
});

export const curatedComparisons: readonly CuratedComparison[] = [
  create({
    slug: PrinterComparisonSlug.BambuLabP1SVsP2S,
    leftId: 'bambu-lab-p1s',
    rightId: 'bambu-lab-p2s',
    title: 'Bambu Lab P1S vs P2S: Differences and Buying Advice',
    description:
      'Compare the Bambu Lab P1S and P2S by price context, enclosure, automation, camera, materials and multicolour options.',
    verdict:
      'The P2S adds a newer control and monitoring experience, quick-swap nozzle workflow and a higher stated bed limit. The P1S is still officially available and supported, so it remains sensible when its current bundle price is materially lower or its mature ecosystem already suits the job.',
    chooseLeftIf: [
      'you can buy it for substantially less in a like-for-like bundle',
      'you already know the P1S workflow or own compatible AMS hardware',
      'you need an enclosed P-series printer but not the newer camera and interface',
    ],
    chooseRightIf: [
      'the price gap is modest for the bundle you actually need',
      'the 1080p monitoring, five-inch touchscreen and quick-swap nozzle workflow matter to you',
      'you value the P2S sensor and automation updates for a first enclosed printer',
    ],
    analysis: [
      'Both printers have the same stated 256 x 256 x 256 mm build volume, so this is not a size upgrade. The P2S case is a generation and workflow decision rather than a capacity decision.',
      'Bambu Lab describes the P2S as a reengineered P1-series model, but explicitly says its launch does not discontinue the P1S. Compare stock and bundle contents in your region before treating one list price as a saving.',
      'The P2S has a 110 C stated maximum bed temperature versus 100 C on the P1S. That does not by itself guarantee success with a material: nozzle, enclosure conditions, filament guidance and part geometry still matter.',
      'Multicolour jobs can add purge waste and print time on either platform. Estimate the actual job with your slicer values rather than assuming the quoted maximum speed gives an equivalent operating cost.',
    ],
    faq: [
      {
        question: 'Is the P2S a direct replacement for the P1S?',
        answer:
          'It is a newer P-series model, but Bambu Lab states that the P1S remains available and supported. Treat it as an alternative with a newer feature set, not an automatic forced replacement.',
      },
      {
        question: 'Should an existing P1S owner upgrade?',
        answer:
          'Only if the newer interface, monitoring, quick-swap nozzle workflow or other P2S-specific features solve a real friction point. Build volume is unchanged.',
      },
    ],
  }),
  create({
    slug: PrinterComparisonSlug.BambuLabA1VsP2S,
    leftId: 'bambu-lab-a1',
    rightId: 'bambu-lab-p2s',
    title: 'Bambu Lab A1 vs P2S: Open-Frame Value or Enclosed CoreXY?',
    description:
      'Compare Bambu Lab A1 and P2S build volume, open versus enclosed design, multicolour systems and practical material limits.',
    verdict:
      'Choose the A1 for a lower-cost, open-frame route to common materials and AMS lite multicolour. Choose the P2S when an enclosure, CoreXY form factor and newer P-series automation are relevant to your materials and workspace.',
    chooseLeftIf: [
      'PLA, PETG and TPU are your main materials',
      'you want a lower initial cost and an AMS lite option',
      'you prefer the A1’s straightforward open-frame format',
    ],
    chooseRightIf: [
      'you need an enclosed printer for temperature-sensitive work',
      'you want the P-series monitoring and quick-swap workflow',
      'you are comparing a P2S bundle with the appropriate AMS system',
    ],
    analysis: [
      'Both have a stated 256 mm cube build volume. The material environment and hardware format are the meaningful differences.',
      'The A1 is open-frame. Bambu Lab cautions that larger high-temperature jobs can suffer reduced layer strength and more warping in that environment.',
      'Price comparisons need the exact base or multicolour bundle stated next to them. AMS lite and AMS 2 Pro are different systems, not interchangeable labels.',
    ],
    faq: [
      {
        question: 'Is the P2S automatically better for beginners?',
        answer:
          'Not automatically. An A1 can be a simpler and less expensive match for common materials. The P2S earns its cost when its enclosed workflow and additional capabilities are useful.',
      },
    ],
  }),
  create({
    slug: PrinterComparisonSlug.BambuLabA1VsA1Mini,
    leftId: 'bambu-lab-a1',
    rightId: 'bambu-lab-a1-mini',
    title: 'Bambu Lab A1 vs A1 Mini: Which Is Right for You?',
    description:
      'Compare Bambu Lab A1 and A1 Mini build volume, footprint, bed temperature, multicolour support and value.',
    verdict:
      'The A1 is the practical choice when you need its 256 mm build cube. The A1 Mini is compelling when 180 mm is enough and a smaller, lighter machine better fits the desk and budget.',
    chooseLeftIf: [
      'you expect to print parts above 180 mm in any direction',
      'you want the larger stated 100 C bed limit',
      'the larger footprint is acceptable',
    ],
    chooseRightIf: [
      'small functional parts, miniatures and compact projects are typical',
      'desk space and carrying weight matter',
      'you want the lowest initial outlay',
    ],
    analysis: [
      'The A1 has over twice the stated build volume of the Mini, even though both are cube-shaped. Check the longest dimension of the models you actually intend to make.',
      'Both support a single AMS lite for up to four colours. Multicolour capability does not remove purge waste or make either model enclosed.',
      'The Mini’s smaller footprint is meaningful in a tight workspace; leave room for filament handling and access, not only the listed machine dimensions.',
    ],
    faq: [
      {
        question: 'Does the A1 Mini print as fast as the A1?',
        answer:
          'Both list a 500 mm/s maximum toolhead speed and 10,000 mm/s² maximum acceleration. Those are manufacturer claims, not InspectMesh benchmark results.',
      },
    ],
  }),
  create({
    slug: PrinterComparisonSlug.BambuLabP1SVsA1,
    leftId: 'bambu-lab-p1s',
    rightId: 'bambu-lab-a1',
    title: 'Bambu Lab P1S vs A1: Enclosure or Open-Frame Value?',
    description:
      'Compare the enclosed Bambu Lab P1S with the open-frame A1 for materials, build volume, multicolour options and price context.',
    verdict:
      'With equal stated build volume, the P1S is mainly the enclosure and P-series ecosystem choice. The A1 is a lower-cost open-frame option for common materials and beginners who do not need that environment.',
    chooseLeftIf: [
      'you plan frequent ABS, ASA or other enclosure-sensitive work',
      'the P1S enclosure and AMS ecosystem fit your setup',
      'you value its CoreXY format and auxiliary cooling',
    ],
    chooseRightIf: [
      'your work is mostly PLA, PETG or TPU',
      'you want a lower entry price with optional AMS lite',
      'you do not need a closed chamber',
    ],
    analysis: [
      'Neither printer wins on stated build size. The selection turns on enclosure, materials and current bundle price.',
      'An enclosure can affect temperature stability, but it is not a guarantee for every material or part geometry. Follow the material manufacturer and printer guidance.',
      'The P1S and A1 use different multicolour accessory families, so compare the full configuration rather than just the printer body.',
    ],
    faq: [
      {
        question: 'Can the A1 be enclosed later?',
        answer:
          'Bambu Lab does not recommend enclosing the A1. Choose the P1S if a supported enclosed workflow is important.',
      },
    ],
  }),
  create({
    slug: PrinterComparisonSlug.BambuLabP1PVsP1S,
    leftId: 'bambu-lab-p1p',
    rightId: 'bambu-lab-p1s',
    title: 'Bambu Lab P1P vs P1S: Is the Enclosure Worth It?',
    description:
      'Compare Bambu Lab P1P and P1S enclosure, cooling, filter, material suitability and availability status.',
    verdict:
      'For a new purchase, the P1S is generally the clearer option where available because it is enclosed and current. For an existing P1P owner, an enclosure upgrade can make sense when its material and cooling benefits address a real need.',
    chooseLeftIf: [
      'you already own a P1P and mostly print open-frame-friendly materials',
      'customisable printable panels are part of your plan',
      'a used P1P price is low enough to justify its discontinued status',
    ],
    chooseRightIf: [
      'you want a factory enclosure, auxiliary cooling and activated-carbon filter',
      'you expect to print ABS or ASA regularly',
      'you want a current model rather than a discontinued one',
    ],
    analysis: [
      'Bambu Lab announced the P1P is reaching end of sale while continuing accessory support for five years. Availability may therefore be used or region-specific.',
      'The P1S adds a plastic-and-glass enclosure, controlled fans and activated-carbon filtering. These differences are more important than the identical build volume.',
      'A P1P enclosure upgrade is not automatically cheaper or equivalent to a P1S purchase. Price the complete kit and consider time, warranty and current availability.',
    ],
    faq: [
      {
        question: 'Are the P1P and P1S the same size?',
        answer:
          'They have the same stated 256 mm cube build volume. The P1S is slightly wider and heavier because of its enclosure.',
      },
    ],
  }),
  ...[
    [
      PrinterComparisonSlug.BambuLabX1CarbonVsP2S,
      'bambu-lab-x1-carbon',
      'bambu-lab-p2s',
      'Bambu Lab X1 Carbon vs P2S: Premium Platform or Newer P-Series?',
      'Compare Bambu Lab X1 Carbon and P2S for buyers weighing premium sensors, bundle price and current P-series workflow.',
      'you value the X1 Carbon configuration and its current bundle fits your budget',
      'you prefer the newer P-series interface and its bundle is a closer match',
    ],
    [
      PrinterComparisonSlug.PrusaCoreOneVsBambuLabP1S,
      'prusa-core-one',
      'bambu-lab-p1s',
      'Original Prusa CORE One vs Bambu Lab P1S: Enclosed CoreXY Choices',
      'Compare two enclosed CoreXY printers by build volume, ecosystem, service approach and current price context.',
      'you prefer the Prusa ecosystem and its build shape fits your models',
      'you want the P1S AMS ecosystem and its 256 mm cube fits your work',
    ],
    [
      PrinterComparisonSlug.PrusaMk4SVsBambuLabA1,
      'prusa-mk4s',
      'bambu-lab-a1',
      'Original Prusa MK4S vs Bambu Lab A1: Open-Frame Printer Choices',
      'Compare open-frame Prusa MK4S and Bambu Lab A1 specifications, workflow and build-volume trade-offs.',
      'a repairable Prusa workflow is your priority',
      'a 256 mm cube and AMS lite option better fit your projects',
    ],
    [
      PrinterComparisonSlug.CrealityK1CVsBambuLabP1S,
      'creality-k1c',
      'bambu-lab-p1s',
      'Creality K1C vs Bambu Lab P1S: Compact or Larger Enclosed CoreXY?',
      'Compare Creality K1C and Bambu Lab P1S for build volume, enclosure and current accessory ecosystem context.',
      '220 mm square capacity is sufficient and its current price matters',
      'you need the larger 256 mm cube and Bambu AMS ecosystem',
    ],
    [
      PrinterComparisonSlug.ElegooNeptune4PlusVsBambuLabA1,
      'elegoo-neptune-4-plus',
      'bambu-lab-a1',
      'Elegoo Neptune 4 Plus vs Bambu Lab A1: Large Format or 256 mm Cube?',
      'Compare a larger open-frame build volume with the Bambu Lab A1 workflow and nominal capacity.',
      'you need the Neptune 4 Plus 320 x 320 x 385 mm build volume',
      '256 mm cube capacity is enough and the A1 workflow suits your setup',
    ],
  ].map(
    ([slug, leftId, rightId, title, description, chooseLeft, chooseRight]) =>
      create({
        slug: slug as string,
        leftId: leftId as string,
        rightId: rightId as string,
        title: title as string,
        description: description as string,
        verdict:
          'Neither printer is a universal winner. Match the stated build volume, enclosure, material guidance, accessory ecosystem and current like-for-like bundle price to the jobs you actually print.',
        chooseLeftIf: [chooseLeft as string],
        chooseRightIf: [chooseRight as string],
        analysis: [
          'Build volume is a hard constraint: check the longest dimension of your model with the Fit Checker before treating a smaller machine as interchangeable.',
          'Maximum speed figures are manufacturer claims, not InspectMesh benchmark results. Estimate cost from the sliced job, material and waste rather than a headline speed.',
        ],
        faq: [
          {
            question: 'Which printer is better?',
            answer:
              'There is no universal winner. Compare the published specifications, current price and your intended materials and model sizes.',
          },
        ],
      }),
  ),
];

export const curatedComparisonsBySlug = new Map(
  curatedComparisons.map((comparison) => [comparison.slug, comparison]),
);

export const curatedComparisonPaths = curatedComparisons.map(
  (comparison) => `${PublicRoutePath.Compare}/${comparison.slug}`,
);

export function comparisonPrinters(
  comparison: CuratedComparison,
): readonly [PrinterRecord, PrinterRecord] {
  return [printerById(comparison.leftId), printerById(comparison.rightId)];
}
