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

const create = (comparison: CuratedComparison) => comparison;

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
