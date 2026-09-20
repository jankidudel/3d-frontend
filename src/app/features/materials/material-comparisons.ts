import { MaterialId } from './material-catalogue';
import { PublicRouteSegment } from '../../core/seo/public-routes';
import { MaterialComparisonSlug } from '../../core/seo/public-routes';

export type MaterialComparison = Readonly<{
  slug: string;
  materialAId: MaterialId;
  materialBId: MaterialId;
  summary: string;
  chooseAWhen: readonly string[];
  chooseBWhen: readonly string[];
  lastReviewedAt: string;
}>;
const reviewed = '2026-09-20';
export const materialComparisons: readonly MaterialComparison[] = [
  {
    slug: MaterialComparisonSlug.PlaVsPetg,
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
