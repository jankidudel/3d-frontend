import type { PrinterRecord } from '../printer-comparison/printer-catalogue';
import { MaterialSlug } from '../../core/seo/public-routes';

export const MaterialId = {
  Pla: 'pla',
  Petg: 'petg',
  Abs: 'abs',
  Asa: 'asa',
  Tpu: 'tpu',
  Nylon: 'pa-nylon',
  Pc: 'pc',
  Pp: 'pp',
} as const;
export type MaterialId = (typeof MaterialId)[keyof typeof MaterialId];
export const CompatibilityVerdict = {
  DocumentedSupported: 'documented-supported',
  LikelyCapable: 'likely-capable',
  Conditional: 'conditional',
  NotRecommended: 'not-recommended',
  Unknown: 'unknown',
} as const;
export type CompatibilityVerdict =
  (typeof CompatibilityVerdict)[keyof typeof CompatibilityVerdict];
export type MaterialRecord = Readonly<{
  id: MaterialId;
  slug: string;
  displayName: string;
  summary: string;
  bestFor: readonly string[];
  poorFitFor: readonly string[];
  difficulty: 'easy' | 'moderate' | 'advanced';
  nozzle: readonly [number, number];
  bed: readonly [number, number];
  density: number;
  enclosure: 'no' | 'helpful' | 'usually';
  drying: 'low' | 'moderate' | 'high';
  ratings: Readonly<{
    stiffness: number;
    toughness: number;
    flexibility: number;
    heat: number;
    weather: number;
    ease: number;
    stability: number;
  }>;
  risks: readonly string[];
  designNotes: readonly string[];
  limitations: readonly string[];
  sourceRefs: readonly string[];
  lastVerifiedAt: string;
}>;
export type ResearchSource = Readonly<{
  id: string;
  title: string;
  url: string;
  publisher: string;
  accessedAt: string;
}>;
const checked = '2026-09-20';
export const materialSources: readonly ResearchSource[] = [
  {
    id: 'prusa-pla',
    title: 'PLA material guidance',
    url: 'https://help.prusa3d.com/article/pla_2062',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-09',
  },
  {
    id: 'prusa-petg',
    title: 'PETG material guidance',
    url: 'https://help.prusa3d.com/article/petg_2059',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-09',
  },
  {
    id: 'prusa-abs',
    title: 'ABS material guidance',
    url: 'https://help.prusa3d.com/article/abs_2058',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-09',
  },
  {
    id: 'prusa-asa',
    title: 'ASA material guidance',
    url: 'https://help.prusa3d.com/article/asa_1809',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-09',
  },
  {
    id: 'prusa-tpu',
    title: 'TPU material guidance',
    url: 'https://help.prusa3d.com/article/flexible-materials_2057',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-09',
  },
  {
    id: 'prusa-pa-nylon',
    title: 'PA-NYLON material guidance',
    url: 'https://help.prusa3d.com/article/polyamide-nylon_167188',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-09',
  },
  {
    id: 'prusa-pc',
    title: 'PC material guidance',
    url: 'https://help.prusa3d.com/article/polycarbonate-pc_165812',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-09',
  },
  {
    id: 'prusa-pp',
    title: 'PP material guidance',
    url: 'https://help.prusa3d.com/article/polypropylene-pp_167126',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-09',
  },
  {
    id: 'prusa-materials',
    title: 'Material guide',
    url: 'https://help.prusa3d.com/materials',
    publisher: 'Prusa Research',
    accessedAt: checked,
  },
  {
    id: 'bambu-filament',
    title: 'Filament guide',
    url: 'https://wiki.bambulab.com/en/filament-acc/filament/filament-guide',
    publisher: 'Bambu Lab',
    accessedAt: checked,
  },
  {
    id: 'matterhackers-nylon',
    title: 'Nylon material guide',
    url: 'https://www.matterhackers.com/articles/how-to-succeed-when-printing-with-nylon',
    publisher: 'MatterHackers',
    accessedAt: checked,
  },
];
const ratings =
  'Ratings are editorial comparison bands for typical unfilled FDM filament families, not laboratory measurements. Formulation, pigments and fillers can change results.';
export const MATERIAL_RATINGS_METHODOLOGY = ratings;
export const materials: readonly MaterialRecord[] = [
  {
    id: MaterialId.Pla,
    slug: MaterialSlug.Pla,
    displayName: 'PLA',
    summary:
      'A generally easy, stiff filament family commonly chosen for visual parts, prototypes and low-heat indoor uses.',
    bestFor: [
      'visual prototypes',
      'display models',
      'dimensionally tidy indoor parts',
    ],
    poorFitFor: ['hot environments', 'parts needing sustained flexibility'],
    difficulty: 'easy',
    nozzle: [190, 230],
    bed: [0, 60],
    density: 1.24,
    enclosure: 'no',
    drying: 'low',
    ratings: {
      stiffness: 4,
      toughness: 2,
      flexibility: 1,
      heat: 1,
      weather: 2,
      ease: 5,
      stability: 4,
    },
    risks: [
      'Softening in heat',
      'Brittle failure in thin or impact-loaded areas',
    ],
    designNotes: [
      'Use generous fillets at stress points.',
      'Do not treat biobased PLA as home-compostable.',
    ],
    limitations: [
      'Not a general outdoor or heat-resistant choice.',
      'Filled PLA needs its own profile.',
    ],
    sourceRefs: ['prusa-pla'],
    lastVerifiedAt: checked,
  },
  {
    id: MaterialId.Petg,
    slug: MaterialSlug.Petg,
    displayName: 'PETG',
    summary:
      'A tougher general-purpose filament family with useful chemical resistance, often selected for functional indoor parts.',
    bestFor: [
      'everyday functional parts',
      'light moisture exposure',
      'moderate impact',
    ],
    poorFitFor: ['very rigid precision features', 'high heat'],
    difficulty: 'moderate',
    nozzle: [230, 250],
    bed: [70, 90],
    density: 1.27,
    enclosure: 'no',
    drying: 'moderate',
    ratings: {
      stiffness: 3,
      toughness: 4,
      flexibility: 2,
      heat: 2,
      weather: 3,
      ease: 4,
      stability: 3,
    },
    risks: ['Stringing', 'Surface adhesion that can damage unsuitable plates'],
    designNotes: [
      'Tune retraction for the exact spool.',
      'Use a release layer where the manufacturer specifies one.',
    ],
    limitations: [
      'May creep under sustained load.',
      'Not a substitute for high-temperature engineering materials.',
    ],
    sourceRefs: ['prusa-petg'],
    lastVerifiedAt: checked,
  },
  {
    id: MaterialId.Abs,
    slug: MaterialSlug.Abs,
    displayName: 'ABS',
    summary:
      'A heat-tolerant engineering thermoplastic family that usually needs careful enclosure, ventilation and warp control.',
    bestFor: ['heat-tolerant housings', 'post-processed functional parts'],
    poorFitFor: ['open-frame beginner printing', 'poorly ventilated spaces'],
    difficulty: 'advanced',
    nozzle: [240, 270],
    bed: [90, 110],
    density: 1.04,
    enclosure: 'usually',
    drying: 'moderate',
    ratings: {
      stiffness: 3,
      toughness: 4,
      flexibility: 2,
      heat: 4,
      weather: 2,
      ease: 2,
      stability: 2,
    },
    risks: [
      'Warping and layer splitting',
      'Emissions require increased ventilation attention',
    ],
    designNotes: [
      'Avoid sharp internal corners.',
      'Use an enclosure only with the printer maker safety guidance.',
    ],
    limitations: [
      'Open-frame printing is commonly unreliable.',
      'Outdoor UV exposure can be a poor fit.',
    ],
    sourceRefs: ['prusa-abs'],
    lastVerifiedAt: checked,
  },
  {
    id: MaterialId.Asa,
    slug: MaterialSlug.Asa,
    displayName: 'ASA',
    summary:
      'An ABS-like material family often chosen for outdoor parts where UV and weather resistance matter.',
    bestFor: ['outdoor enclosures', 'weather-exposed brackets'],
    poorFitFor: ['open-frame beginner printing', 'poorly ventilated spaces'],
    difficulty: 'advanced',
    nozzle: [240, 270],
    bed: [90, 110],
    density: 1.07,
    enclosure: 'usually',
    drying: 'moderate',
    ratings: {
      stiffness: 3,
      toughness: 4,
      flexibility: 2,
      heat: 4,
      weather: 5,
      ease: 2,
      stability: 2,
    },
    risks: [
      'Warping and layer splitting',
      'Ventilation needs increased attention',
    ],
    designNotes: [
      'Design for thermal movement.',
      'Verify the exact formulation for outdoor exposure.',
    ],
    limitations: [
      'Usually needs a controlled build environment.',
      'Not a universal food-contact or safety material.',
    ],
    sourceRefs: ['prusa-asa'],
    lastVerifiedAt: checked,
  },
  {
    id: MaterialId.Tpu,
    slug: MaterialSlug.Tpu,
    displayName: 'TPU',
    summary:
      'A flexible filament family used for grips, bumpers and compliant parts; hardness grades vary substantially.',
    bestFor: ['flexible parts', 'vibration damping', 'protective bumpers'],
    poorFitFor: [
      'rigid dimension-critical parts',
      'very fast unsupported printing',
    ],
    difficulty: 'moderate',
    nozzle: [210, 240],
    bed: [30, 60],
    density: 1.21,
    enclosure: 'no',
    drying: 'moderate',
    ratings: {
      stiffness: 1,
      toughness: 5,
      flexibility: 5,
      heat: 2,
      weather: 3,
      ease: 3,
      stability: 2,
    },
    risks: [
      'Feeding problems in loose filament paths',
      'Moisture-related surface defects',
    ],
    designNotes: [
      'Match design clearance to the chosen Shore hardness.',
      'A constrained filament path can help.',
    ],
    limitations: [
      'TPU is a family, not one hardness.',
      'Multimaterial handling varies by printer.',
    ],
    sourceRefs: ['prusa-tpu'],
    lastVerifiedAt: checked,
  },
  {
    id: MaterialId.Nylon,
    slug: MaterialSlug.Nylon,
    displayName: 'PA / Nylon',
    summary:
      'A broad, tough engineering-filament family whose moisture sensitivity and formulation differences need deliberate preparation.',
    bestFor: ['wear parts', 'tough functional components'],
    poorFitFor: ['casual storage', 'uncontrolled open-frame printing'],
    difficulty: 'advanced',
    nozzle: [250, 290],
    bed: [70, 100],
    density: 1.14,
    enclosure: 'helpful',
    drying: 'high',
    ratings: {
      stiffness: 3,
      toughness: 5,
      flexibility: 3,
      heat: 4,
      weather: 3,
      ease: 1,
      stability: 2,
    },
    risks: ['Rapid moisture uptake', 'Warping and dimensional variation'],
    designNotes: [
      'Specify the PA family before sizing precision features.',
      'Dry to the spool manufacturer guidance.',
    ],
    limitations: [
      'PA6, PA12 and blends behave differently.',
      'Filled variants can need an abrasion-resistant nozzle.',
    ],
    sourceRefs: ['prusa-pa-nylon'],
    lastVerifiedAt: checked,
  },
  {
    id: MaterialId.Pc,
    slug: MaterialSlug.Polycarbonate,
    displayName: 'Polycarbonate / PC',
    summary:
      'A high-heat, tough material family for capable machines, with demanding temperature and enclosure requirements.',
    bestFor: ['high-heat functional parts', 'tough engineering components'],
    poorFitFor: ['low-temperature open printers', 'casual first prints'],
    difficulty: 'advanced',
    nozzle: [260, 310],
    bed: [90, 120],
    density: 1.2,
    enclosure: 'usually',
    drying: 'high',
    ratings: {
      stiffness: 4,
      toughness: 5,
      flexibility: 2,
      heat: 5,
      weather: 3,
      ease: 1,
      stability: 2,
    },
    risks: ['Warping', 'Moisture defects', 'Build surface damage'],
    designNotes: [
      'Verify the printer and build-surface maker guidance.',
      'Allow for thermal stress in large parts.',
    ],
    limitations: [
      'Many printers cannot reach every PC profile.',
      'Blends may have different requirements.',
    ],
    sourceRefs: ['prusa-pc'],
    lastVerifiedAt: checked,
  },
  {
    id: MaterialId.Pp,
    slug: MaterialSlug.Polypropylene,
    displayName: 'Polypropylene / PP',
    summary:
      'A lightweight, chemically resistant material family with demanding bed adhesion and warping behaviour.',
    bestFor: [
      'chemical-contact components',
      'living hinges',
      'lightweight parts',
    ],
    poorFitFor: [
      'small unsupported precision parts',
      'general purpose first prints',
    ],
    difficulty: 'advanced',
    nozzle: [220, 250],
    bed: [80, 100],
    density: 0.9,
    enclosure: 'helpful',
    drying: 'low',
    ratings: {
      stiffness: 2,
      toughness: 4,
      flexibility: 3,
      heat: 3,
      weather: 4,
      ease: 1,
      stability: 1,
    },
    risks: [
      'Strong shrinkage and warping',
      'Poor adhesion without a suitable surface',
    ],
    designNotes: [
      'Use a surface recommended for the exact PP spool.',
      'Plan generous tolerances.',
    ],
    limitations: [
      'Properties depend strongly on grade.',
      'Do not infer food-contact suitability.',
    ],
    sourceRefs: ['prusa-pp'],
    lastVerifiedAt: checked,
  },
];
export const materialsById = new Map(
  materials.map((material) => [material.id, material]),
);
export const materialsBySlug = new Map(
  materials.map((material) => [material.slug, material]),
);
export type CompatibilityResult = Readonly<{
  verdict: CompatibilityVerdict;
  reasons: readonly string[];
  requirements: readonly string[];
  cautions: readonly string[];
}>;
export function compatibilityFor(
  printer: PrinterRecord | undefined,
  material: MaterialRecord,
): CompatibilityResult {
  if (!printer) {
    return {
      verdict: CompatibilityVerdict.Unknown,
      reasons: ['No printer was selected.'],
      requirements: [],
      cautions: ['Choose a printer to check documented hardware context.'],
    };
  }
  const documented: Readonly<Record<string, readonly MaterialId[]>> = {
    'bambu-lab-a1': [MaterialId.Pla, MaterialId.Petg, MaterialId.Tpu],
    'bambu-lab-a1-mini': [MaterialId.Pla, MaterialId.Petg, MaterialId.Tpu],
    'bambu-lab-p1s': [
      MaterialId.Pla,
      MaterialId.Petg,
      MaterialId.Tpu,
      MaterialId.Abs,
      MaterialId.Asa,
    ],
    'bambu-lab-p1p': [MaterialId.Pla, MaterialId.Petg, MaterialId.Tpu],
  };
  const named = documented[printer.id]?.includes(material.id) ?? false;
  if (named) {
    return {
      verdict: CompatibilityVerdict.DocumentedSupported,
      reasons: [
        `${printer.displayName} documentation lists this material family.`,
      ],
      requirements: [
        'Check the exact spool profile and printer documentation.',
      ],
      cautions: [
        'Base-material support does not automatically include filled or abrasive variants.',
      ],
    };
  }
  if (material.enclosure === 'usually' && !printer.enclosed) {
    return {
      verdict: CompatibilityVerdict.NotRecommended,
      reasons: [
        'This material usually benefits from a controlled enclosure and this printer is open-frame.',
      ],
      requirements: [
        'Use a printer and environment documented for the exact material.',
      ],
      cautions: ['Temperature capability alone is not proof of compatibility.'],
    };
  }
  return {
    verdict: CompatibilityVerdict.Unknown,
    reasons: [
      'Exact manufacturer support for this printer, nozzle and material combination has not been verified.',
    ],
    requirements: [
      'Check the printer material table, extrusion hardware and exact filament datasheet.',
    ],
    cautions: [
      'Nozzle temperature alone cannot establish compatibility; filled variants and feed paths can require different hardware.',
    ],
  };
}
