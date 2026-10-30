import type { PrinterRecord } from '../printer-comparison/printer-catalogue';
import type { ProductEvidence } from './material-evidence';
import {
  EvidenceScope,
  EvidenceAvailability,
  MaterialProperty,
} from './material-evidence';
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
  productExample?: ProductEvidence;
}>;
export type ResearchSource = Readonly<{
  id: string;
  title: string;
  url: string;
  publisher: string;
  accessedAt: string;
  documentVersion?: string;
  documentDate?: string;
}>;
const checked = '2026-09-20';
export const materialSources: readonly ResearchSource[] = [
  {
    id: 'grade-pla',
    title: 'Prusament PLA / PLA Blend - historical technical sheet',
    url: 'https://prusament.com/wp-content/uploads/2022/10/PLA_Prusament_TDS_2021_10_EN.pdf',
    publisher: 'Prusa Polymers',
    accessedAt: '2026-10-29',
    documentVersion: '1.1',
    documentDate: '2022-02-16',
  },
  {
    id: 'grade-petg',
    title: 'Prusament PETG technical sheet',
    url: 'https://storage.googleapis.com/prusa3d-content-prod-14e8-wordpress-prusament-prod/2023/10/9f8d2165-tds_prusament-petg_n_en.pdf',
    publisher: 'Prusa Polymers',
    accessedAt: '2026-10-29',
    documentVersion: '1.1',
    documentDate: '2022-02-16',
  },
  {
    id: 'grade-abs',
    title: 'PolyLite ABS technical sheet - linked from current product page',
    url: 'https://polymaker.com/wp-content/uploads/lana-downloads/TDS_Polymaker_PolyLite-ABS_V5.6_2025-12-30_EN.pdf',
    publisher: 'Polymaker',
    accessedAt: '2026-10-29',
    documentVersion: '5.6',
  },
  {
    id: 'grade-asa',
    title: 'Prusament ASA technical sheet',
    url: 'https://storage.googleapis.com/prusa3d-content-prod-14e8-wordpress-prusament-prod/2024/05/bc8551ef-tds_prusament-asa_2024_en.pdf',
    publisher: 'Prusa Polymers',
    accessedAt: '2026-10-29',
    documentVersion: '1.1',
    documentDate: '2024-05-20',
  },
  {
    id: 'grade-tpu',
    title: 'Prusament TPU 95A technical sheet',
    url: 'https://storage.googleapis.com/prusa3d-content-prod-14e8-wordpress-prusament-prod/2025/05/80316f6d-tds-prusament_tpu_95a_en-1.pdf',
    publisher: 'Prusa Polymers',
    accessedAt: '2026-10-29',
    documentVersion: '1.0',
    documentDate: '2025-05-29',
  },
  {
    id: 'grade-pa11',
    title: 'Prusament PA11 technical sheet',
    url: 'https://storage.googleapis.com/prusa3d-content-prod-14e8-wordpress-prusament-prod/2026/08/2d2145fc-pa11_tds_eng.pdf',
    publisher: 'Prusa Polymers',
    accessedAt: '2026-10-29',
    documentVersion: '1.0',
    documentDate: '2026-07-22',
  },
  {
    id: 'grade-pc',
    title: 'Prusament PC Blend technical sheet',
    url: 'https://prusament.com/wp-content/uploads/2022/10/PCBlend_Prusament_TDS_2022_16_EN.pdf',
    publisher: 'Prusa Polymers',
    accessedAt: '2026-10-29',
    documentVersion: '1.1',
    documentDate: '2022-02-16',
  },
  {
    id: 'grade-pp',
    title: 'Prusament PP Carbon Fiber technical sheet',
    url: 'https://storage.googleapis.com/prusa3d-content-prod-14e8-wordpress-prusament-prod/2025/01/b4ef2bf6-technical-data-sheet-1.pdf',
    publisher: 'Prusa Polymers',
    accessedAt: '2026-10-29',
    documentVersion: '1.0',
    documentDate: '2024-11-15',
  },
  {
    id: 'product-pla',
    title: 'Prusament PLA product documentation',
    url: 'https://prusament.com/materials/pla/',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-29',
  },
  {
    id: 'product-petg',
    title: 'Prusament PETG product documentation',
    url: 'https://prusament.com/materials/prusament-petg/',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-29',
  },
  {
    id: 'product-asa',
    title: 'Prusament ASA product documentation',
    url: 'https://prusament.com/materials/prusament-asa/',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-29',
  },
  {
    id: 'product-tpu',
    title: 'Prusament TPU 95A product documentation',
    url: 'https://prusament.com/materials/prusament-tpu-95a/',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-29',
  },
  {
    id: 'product-pa11',
    title: 'Prusament PA11 product documentation',
    url: 'https://prusament.com/materials/prusament-pa11/',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-29',
  },
  {
    id: 'product-pc',
    title: 'Prusament PC Blend product documentation',
    url: 'https://prusament.com/materials/prusament-pc-blend/',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-29',
  },
  {
    id: 'product-pp',
    title: 'Prusament PP Carbon Fiber product documentation',
    url: 'https://prusament.com/materials/prusament-pp/',
    publisher: 'Prusa Research',
    accessedAt: '2026-10-29',
  },
  {
    id: 'product-abs',
    title: 'PolyLite ABS product documentation',
    url: 'https://polymaker.com/product/polylite-abs',
    publisher: 'Polymaker',
    accessedAt: '2026-10-29',
  },
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
    productExample: {
      manufacturer: 'Prusa Polymers',
      productName: 'Prusament PLA / PLA Blend',
      formulation: 'PLA; document covers PLA and PLA Blend',
      heading: 'Read a product sheet without turning it into a service rating',
      interpretation:
        'The historical sheet separates print settings from specimen stiffness. A tidy room-temperature fit model can help locate rigid features; neither stiffness nor HDT establishes creep under a persistent warm load.',
      nextCheck:
        'Record temperature at the mounting point and load duration before carrying a fit prototype into service. Use the PLA/PETG pair for handling and PLA/TPU for intentional compliance.',
      revisionNote:
        'The current PLA page links a ZIP that could not be inspected in this review. This example uses the verified 16 February 2022 PDF, not a claim that it is the latest revision.',
      claims: [
        {
          id: 'pla-density',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Density,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pla',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Filament/material density, not sliced-job consumption.',
          ],
          value: 1.24,
          unit: 'g/cm³',
          method: 'ISO 1183',
        },
        {
          id: 'pla-nozzle',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Nozzle,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pla',
          sourceLocation: 'p. 1, recommended settings',
          limitations: [],
          range: {
            min: 200,
            max: 220,
          },
          unit: '°C',
        },
        {
          id: 'pla-modulus',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Modulus,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pla',
          sourceLocation: 'p. 2, printed-specimen table; p. 3, footnote setup',
          limitations: [
            'Moisture conditioning and test-room temperature are not specified for this row.',
          ],
          value: 2.3,
          uncertainty: 0.1,
          unit: 'GPa',
          method: 'ISO 527-1',
          specimen:
            'MK3; Slic3r Prusa Edition 1.40.0; 0.20 mm FAST; 100% rectilinear infill; 2 perimeters; no top/bottom; 215 °C nozzle; 60 °C bed',
          orientation: 'Horizontal',
        },
        {
          id: 'pla-hdt-180',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Hdt,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pla',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Test deflection temperature, not continuous operating capability.',
          ],
          value: 55,
          unit: '°C',
          method: 'ISO 75',
          testLoad: '1.80 MPa',
        },
      ],
    },
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
    productExample: {
      manufacturer: 'Prusa Polymers',
      productName: 'Prusament PETG',
      formulation: 'Polyethylene terephthalate glycol copolymer',
      heading: 'What evidence justifies changing an established workflow?',
      interpretation:
        'The sheet reports stiffness separately from impact behaviour; the family guide describes ductility and difficult support removal. A handling requirement can justify investigating PETG, but a stiffness value cannot prove toughness or sustained-load performance.',
      nextCheck:
        'Write the failing requirement first: breakage during handling, unacceptable bending, support access or warm-service deformation. Then compare matching properties and recheck the exact surface-release instructions.',
      claims: [
        {
          id: 'petg-speed',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Speed,
          availability: EvidenceAvailability.Published,
          value: 200,
          unit: 'mm/s',
          sourceId: 'grade-petg',
          sourceLocation: 'p. 1, recommended print settings (up to 200 mm/s)',
          limitations: [
            'Linear-speed guidance without extrusion width and height in that row does not establish a measured volumetric-flow limit.',
          ],
        },

        {
          id: 'petg-density',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Density,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-petg',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Filament/material density, not sliced-job consumption.',
          ],
          value: 1.27,
          unit: 'g/cm³',
          method: 'ISO 1183',
        },
        {
          id: 'petg-modulus',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Modulus,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-petg',
          sourceLocation: 'p. 2, printed-specimen table; p. 3, footnote setup',
          limitations: [
            'Moisture conditioning and test-room temperature are not specified for this row.',
          ],
          value: 1.5,
          uncertainty: 0.1,
          unit: 'GPa',
          method: 'ISO 527-1',
          specimen:
            'MK3; Slic3r Prusa Edition 1.40.0; 0.20 mm FAST; 100% rectilinear infill; 2 perimeters; no top/bottom; 250 °C nozzle; 80 °C bed',
          orientation: 'Horizontal',
        },
        {
          id: 'petg-hdt-180',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Hdt,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-petg',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Test deflection temperature, not continuous operating capability.',
          ],
          value: 68,
          unit: '°C',
          method: 'ISO 75',
          testLoad: '1.80 MPa',
        },
        {
          id: 'petg-surface',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Surface,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-petg',
          sourceLocation: 'p. 1, bed type and footnote',
          limitations: [],
          statement:
            'Satin or powder-coated sheet; smooth PEI with a glue-stick layer.',
        },
      ],
    },
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
    productExample: {
      manufacturer: 'Polymaker',
      productName: 'PolyLite ABS',
      formulation: 'ABS, SKU PE01001 in the source testing note',
      heading: 'A named formulation changes the preparation checklist',
      interpretation:
        'The linked V5.6 sheet requires a chamber and lists nozzle and bed settings. Those are preparation instructions for PolyLite ABS. A warm cover still needs its actual load, duration and exposure checked; subtracting a margin from HDT would not create an allowable service rating.',
      nextCheck:
        'Before the housing-corner trial, verify chamber suitability, plate treatment and the exact profile. Compare ABS/ASA for exposure or PLA/ABS for the cost of changing the process.',
      revisionNote:
        'V5.6 is linked by the current product page. The filename includes 2025-12-30, but no issue date is printed in the document. Some fields contain apparent copy errors; ambiguous tensile and environmental-temperature entries are not imported.',
      enclosureRequired: true,
      claims: [
        {
          id: 'abs-chamber',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Enclosure,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-abs',
          sourceLocation: 'p. 1, recommended printing conditions',
          limitations: [],
          statement: 'A closure chamber is needed for this product.',
        },
        {
          id: 'abs-nozzle',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Nozzle,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-abs',
          sourceLocation: 'p. 1, recommended printing conditions',
          limitations: [],
          range: {
            min: 245,
            max: 265,
          },
          unit: '°C',
        },
        {
          id: 'abs-density',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Density,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-abs',
          sourceLocation: 'p. 1, physical properties',
          limitations: [
            'Filament/material density, not sliced-job consumption.',
          ],
          value: 1.04,
          unit: 'g/cm³',
          method: 'ISO 1183 / GB/T 1033',
          testTemperature: '23 °C',
        },
      ],
    },
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
    productExample: {
      manufacturer: 'Prusa Polymers',
      productName: 'Prusament ASA',
      formulation: 'Acrylonitrile styrene acrylate',
      heading: 'What does the exposure evidence actually cover?',
      interpretation:
        'Prusa describes this product as UV-stable. The inspected product page and sheet do not provide an outdoor test duration or standard supporting a lifespan. Sunlight, heat, moisture and sustained load remain separate requirements for the sensor cover.',
      nextCheck:
        'Record exposure location, orientation, peak surface temperature, rain paths and attachment load. Request an exposure protocol or retain dated observations before promising colour or service life.',
      claims: [
        {
          id: 'asa-modulus',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Modulus,
          availability: EvidenceAvailability.Published,
          value: 1.6,
          uncertainty: 0.1,
          unit: 'GPa',
          method: 'ISO 527-1',
          sourceId: 'grade-asa',
          sourceLocation: 'p. 2, printed-specimen table; p. 3, setup footnote',
          specimen:
            'MK3S; Slic3r Prusa Edition 2.0.0; 0.20 mm FAST; 100% rectilinear infill; 2 perimeters; no top/bottom; 265 °C nozzle; 110 °C bed',
          orientation: 'Horizontal',
          limitations: [
            'Mechanical moisture conditioning and test-room temperature are not specified.',
          ],
        },

        {
          id: 'asa-density',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Density,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-asa',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Filament/material density, not sliced-job consumption.',
          ],
          value: 1.07,
          unit: 'g/cm³',
          method: 'ISO 1183',
        },
        {
          id: 'asa-hdt-180',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Hdt,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-asa',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Test deflection temperature, not continuous operating capability.',
          ],
          value: 86,
          unit: '°C',
          method: 'ISO 75',
          testLoad: '1.80 MPa',
        },
        {
          id: 'asa-uv',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Uv,
          availability: EvidenceAvailability.Published,
          sourceId: 'product-asa',
          sourceLocation: 'Characteristics and Outdoor use',
          limitations: [
            'A manufacturer statement, not a retained outdoor test of your printed part.',
          ],
          statement:
            'Manufacturer describes Prusament ASA as UV-stable; no exposure standard or duration was found in the inspected references.',
        },
        {
          id: 'asa-enclosure',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Enclosure,
          availability: EvidenceAvailability.Published,
          sourceId: 'product-asa',
          sourceLocation: 'Printer requirements',
          limitations: [
            'Recommendation for this product; not an impossibility rule for every ASA spool.',
          ],
          statement: 'A skirt or enclosure is recommended.',
        },
      ],
    },
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
    productExample: {
      manufacturer: 'Prusa Polymers',
      productName: 'Prusament TPU 95A',
      formulation:
        'Thermoplastic polyurethane; ether-diol type identified on product page',
      heading: 'Identify hardness before planning deformation',
      interpretation:
        '95A is the product name. The sheet separately reports measured Shore A and Shore D results. Neither scale is a percentage of flexibility, and equal hardness would not establish equal fatigue. Feed support and accessible supports still need a printer-specific plan.',
      nextCheck:
        'For a second candidate, record product: ___; hardness scale/value: ___; feed path/profile: ___; compression or bend requirement: ___. No second product or physical compression test is assumed.',
      claims: [
        {
          id: 'tpu-density',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Density,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-tpu',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Filament/material density, not sliced-job consumption.',
          ],
          value: 1.25,
          unit: 'g/cm³',
          method: 'ISO 1183',
        },
        {
          id: 'tpu-shore-a',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.HardnessA,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-tpu',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Product designation 95A differs from this reported test result.',
          ],
          value: 92,
          uncertainty: 0.4,
          unit: 'Shore A',
          method: 'Prusa Polymers',
        },
        {
          id: 'tpu-shore-d',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.HardnessD,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-tpu',
          sourceLocation: 'p. 2, typical properties',
          limitations: ['Cannot be ranked against a Shore A number.'],
          value: 39,
          uncertainty: 0.7,
          unit: 'Shore D',
          method: 'Prusa Polymers',
        },
        {
          id: 'tpu-hdt-180',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Hdt,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-tpu',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Test deflection temperature, not continuous operating capability.',
          ],
          value: 78.6,
          unit: '°C',
          method: 'ISO 75',
          testLoad: '1.80 MPa',
        },
      ],
      checklist: [
        'Printed tests used an MK4S, PrusaSlicer 2.8.1, 0.4 mm brass nozzle, 0.20 mm layers and 100% rectilinear infill; see sheet p. 3.',
        'Confirm the feed-path and release-layer instructions for your actual printer. No conditioning protocol is specified for the hardness rows.',
      ],
    },
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
    productExample: {
      manufacturer: 'Prusa Polymers',
      productName: 'Prusament PA11',
      formulation: 'Polyamide 11, unfilled; not PA6, PA12 or PA11 Carbon Fiber',
      heading: 'PA chemistry and condition belong beside the value',
      interpretation:
        'The named example is unfilled PA11. Its horizontal specimen modulus is not a property of every nylon. The sheet does not state a dry-versus-conditioned mechanical protocol, so these values cannot supply a wet strength or dimensional correction.',
      nextCheck:
        'Keep chemistry, filler status, drying/storage dates and feed conditions with the existing long-job trial. The chamber instruction is a product requirement, even though generic nylon enclosure advice is only a starting point.',
      enclosureRequired: true,
      claims: [
        {
          id: 'pa11-density',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Density,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pa11',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Filament/material density, not sliced-job consumption.',
          ],
          value: 1.02,
          unit: 'g/cm³',
          method: 'ISO 1183',
        },
        {
          id: 'pa11-modulus',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Modulus,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pa11',
          sourceLocation: 'p. 2, printed-specimen table; p. 3, footnote setup',
          limitations: [
            'Moisture conditioning and test-room temperature are not specified for this row.',
          ],
          value: 1.2,
          uncertainty: 0,
          unit: 'GPa',
          method: 'ISO 527-1',
          specimen:
            'CORE One+ firmware 6.4.0; 0.4 mm High-Flow CHT; PrusaSlicer 2.9.6; 0.20 mm layers; 100% rectilinear; 2 perimeters; no top/bottom; 275 °C nozzle; 100 °C bed; 55 °C chamber',
          orientation: 'Horizontal',
        },
        {
          id: 'pa11-enclosure',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Enclosure,
          availability: EvidenceAvailability.Published,
          sourceId: 'product-pa11',
          sourceLocation: 'Printer requirements',
          limitations: [],
          statement:
            'The product page specifies a chamber at 55 ± 5 °C; the sheet recommends the same chamber setting.',
        },
        {
          id: 'pa11-drying',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Drying,
          availability: EvidenceAvailability.Published,
          sourceId: 'product-pa11',
          sourceLocation: 'Beginners tips: PA11 drying',
          limitations: [],
          statement:
            'For uncertain storage history, the product page recommends 90 °C for 6 to 8 hours. Check spool and dryer limits separately.',
        },
      ],
    },
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
    productExample: {
      manufacturer: 'Prusa Polymers',
      productName: 'Prusament PC Blend',
      formulation: 'Polycarbonate blend; not pure PC or PC Blend Carbon Fiber',
      heading: 'Equipment evidence before a long print',
      interpretation:
        'The blend identity matters. The sheet separates preparation settings and loaded deflection tests. Its values cannot qualify another PC or a filled variant. A large footprint needs warp evidence beyond a successful small fit sample.',
      nextCheck:
        'Check the full printer profile, bed and surface-release instructions, enclosure guidance and footprint trial before the long guard. A maximum nozzle temperature alone leaves these questions unanswered.',
      claims: [
        {
          id: 'pc-density',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Density,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pc',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Filament/material density, not sliced-job consumption.',
          ],
          value: 1.22,
          unit: 'g/cm³',
          method: 'Prusa Polymers',
        },
        {
          id: 'pc-hdt-180',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Hdt,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pc',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Test deflection temperature, not continuous operating capability.',
          ],
          value: 93,
          unit: '°C',
          method: 'ISO 75',
          testLoad: '1.80 MPa',
        },
        {
          id: 'pc-modulus',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Modulus,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pc',
          sourceLocation: 'p. 2, printed-specimen table; p. 3, footnote setup',
          limitations: [
            'Moisture conditioning and test-room temperature are not specified for this row.',
          ],
          value: 1.9,
          uncertainty: 0.1,
          unit: 'GPa',
          method: 'ISO 527-1',
          specimen:
            'MK3S; PrusaSlicer 2.1.1; 0.20 mm FAST; 100% rectilinear infill; 2 perimeters; no top/bottom; 275 °C nozzle; 110 °C bed',
          orientation: 'Horizontal',
        },
        {
          id: 'pc-surface',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Surface,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pc',
          sourceLocation: 'p. 1, bed type and footnote',
          limitations: [],
          statement:
            'Satin sheet; smooth PEI and powder-coated sheets with a glue-stick separating layer.',
        },
      ],
      checklist: [
        'Read the selected printer record: an absent nozzle or bed limit is unknown.',
        'Verify the exact blend profile and bed capability, then the maker-approved enclosure or skirt arrangement.',
        'Confirm sheet, separation layer and removal method together. Do not infer a filled-nozzle upgrade.',
        'Retain a representative cooled footprint observation before committing to the full part.',
      ],
    },
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
    productExample: {
      manufacturer: 'Prusa Polymers',
      productName: 'Prusament PP Carbon Fiber',
      formulation:
        'Carbon-fibre-filled polypropylene; not an unfilled hinge grade',
      heading: 'Separate mass savings from adhesion and hinge life',
      interpretation:
        'This filled example has a published density of 0.91 g/cm³. At an illustrative solid volume of 100 cm³ it gives 91 g; the PETG example at 1.27 gives 127 g. This equal-volume arithmetic is not sliced-job consumption or a drop-in material substitution.',
      nextCheck:
        'Use the product-specific surface and hardened-nozzle requirements. For repeated flexure, record geometry, amplitude, load, environment and observed cycles; no hinge lifetime is supplied by this density example.',
      hardenedNozzleRequired: true,
      claims: [
        {
          id: 'pp-density',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Density,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pp',
          sourceLocation: 'p. 2, typical properties',
          limitations: [
            'Filament/material density, not sliced-job consumption.',
          ],
          value: 0.91,
          unit: 'g/cm³',
          method: 'ISO 1183',
        },
        {
          id: 'pp-surface',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.Surface,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pp',
          sourceLocation: 'p. 1, bed type',
          limitations: [],
          statement: 'The sheet specifies a PP print sheet.',
        },
        {
          id: 'pp-nozzle-wear',
          scope: EvidenceScope.Grade,
          property: MaterialProperty.NozzleWear,
          availability: EvidenceAvailability.Published,
          sourceId: 'grade-pp',
          sourceLocation: 'p. 1, additional information',
          limitations: [],
          statement: 'A hardened nozzle is necessary.',
        },
      ],
    },
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
