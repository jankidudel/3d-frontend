export const PrinterStatus = {
  Current: 'current',
  Discontinued: 'discontinued',
} as const;

export type PrinterStatus = (typeof PrinterStatus)[keyof typeof PrinterStatus];

export const PrinterEditorialState = {
  SpecResearch: 'spec_research',
  EditorialComparison: 'editorial_comparison',
  HandsOnReview: 'hands_on_review',
} as const;

export type PrinterEditorialState =
  (typeof PrinterEditorialState)[keyof typeof PrinterEditorialState];

export interface SourceReference {
  readonly label: string;
  readonly url: string;
  readonly lastVerified: string;
}

export interface PrinterRecord {
  readonly id: string;
  readonly slug: string;
  readonly displayName: string;
  readonly status: PrinterStatus;
  readonly bestFor: string;
  readonly buildVolumeMm: readonly [number, number, number];
  readonly machineDimensionsMm: readonly [number, number, number];
  readonly enclosed: boolean;
  readonly maxNozzleTemperatureC: number;
  readonly maxBedTemperatureC: number;
  readonly maxClaimedSpeedMmS: number;
  readonly maxClaimedAccelerationMmS2: number;
  readonly camera: string;
  readonly multicolour: string;
  readonly materials: string;
  readonly indicativeUsdPrice?: number;
  readonly priceDescription?: string;
  readonly officialProductUrl: string;
  readonly sources: readonly SourceReference[];
  readonly lastVerified: string;
  readonly published?: boolean;
  readonly editorialState?: PrinterEditorialState;
  readonly summary?: string;
  readonly strengths?: readonly string[];
  readonly limitations?: readonly string[];
}

const verified = '2026-09-20';
const bambuStore = 'https://us.store.bambulab.com';
const p1Source: SourceReference = {
  label: 'Bambu Lab P1S technical specifications',
  url: `${bambuStore}/collections/3d-printer/products/p1s`,
  lastVerified: verified,
};
const a1Source: SourceReference = {
  label: 'Bambu Lab A1 technical specifications',
  url: `${bambuStore}/products/a1`,
  lastVerified: verified,
};

export const printers: readonly PrinterRecord[] = [
  {
    id: 'bambu-lab-a1-mini',
    slug: 'bambu-lab-a1-mini',
    displayName: 'Bambu Lab A1 Mini',
    status: PrinterStatus.Current,
    bestFor: 'small PLA, PETG and TPU projects where footprint matters',
    buildVolumeMm: [180, 180, 180],
    machineDimensionsMm: [347, 315, 365],
    enclosed: false,
    maxNozzleTemperatureC: 300,
    maxBedTemperatureC: 80,
    maxClaimedSpeedMmS: 500,
    maxClaimedAccelerationMmS2: 10000,
    camera: 'Low-frame-rate 1080p camera with timelapse',
    multicolour: 'Up to 4 colours with one AMS lite',
    materials:
      'Ideal: PLA, PETG, TPU, PVA. Enclosure-dependent materials are not recommended.',
    indicativeUsdPrice: 249,
    priceDescription: 'Manufacturer store price observed; base printer only.',
    officialProductUrl: `${bambuStore}/products/a1-mini`,
    sources: [
      {
        label: 'Bambu Lab A1 Mini technical specifications',
        url: `${bambuStore}/products/a1-mini`,
        lastVerified: verified,
      },
    ],
    lastVerified: verified,
    published: true,
    editorialState: PrinterEditorialState.SpecResearch,
    summary:
      'A compact open-frame printer with a 180 mm cube build volume and optional AMS lite multicolour workflow.',
    strengths: [
      'Small footprint for a desktop FDM printer',
      'Optional four-colour AMS lite workflow',
    ],
    limitations: [
      '180 mm build volume limits larger parts',
      'Open frame is not intended for enclosure-dependent materials',
    ],
  },
  {
    id: 'bambu-lab-a1',
    slug: 'bambu-lab-a1',
    displayName: 'Bambu Lab A1',
    status: PrinterStatus.Current,
    bestFor: 'larger open-frame PLA, PETG and TPU projects with simple setup',
    buildVolumeMm: [256, 256, 256],
    machineDimensionsMm: [385, 410, 430],
    enclosed: false,
    maxNozzleTemperatureC: 300,
    maxBedTemperatureC: 100,
    maxClaimedSpeedMmS: 500,
    maxClaimedAccelerationMmS2: 10000,
    camera: 'Low-frame-rate 1080p camera with timelapse',
    multicolour: 'Up to 4 colours with one AMS lite',
    materials:
      'Ideal: PLA, PETG, TPU, PVA. Larger high-temperature prints can warp in its open frame.',
    indicativeUsdPrice: 349,
    priceDescription: 'Manufacturer store price observed; base printer only.',
    officialProductUrl: `${bambuStore}/products/a1`,
    sources: [a1Source],
    lastVerified: verified,
    published: true,
    editorialState: PrinterEditorialState.SpecResearch,
    summary:
      'An open-frame 256 mm cube printer aimed at common materials and simple multicolour printing.',
    strengths: ['256 mm cube build volume', 'Optional AMS lite support'],
    limitations: [
      'Open frame limits temperature control',
      'AMS lite needs additional workspace',
    ],
  },
  {
    id: 'bambu-lab-p1p',
    slug: 'bambu-lab-p1p',
    displayName: 'Bambu Lab P1P',
    status: PrinterStatus.Discontinued,
    bestFor: 'owners of the older open-frame CoreXY platform',
    buildVolumeMm: [256, 256, 256],
    machineDimensionsMm: [386, 389, 458],
    enclosed: false,
    maxNozzleTemperatureC: 300,
    maxBedTemperatureC: 100,
    maxClaimedSpeedMmS: 500,
    maxClaimedAccelerationMmS2: 20000,
    camera: 'Low-frame-rate 720p camera with timelapse',
    multicolour: 'Compatible with AMS accessories',
    materials:
      'Ideal: PLA, PETG, TPU, PVA, PET. PA, PC, ABS and ASA need an enclosure; fibre-filled materials are not recommended.',
    officialProductUrl: 'https://uk.store.bambulab.com/products/p1p',
    sources: [
      {
        label: 'Bambu Lab P1P technical specifications',
        url: 'https://public-cdn.bambulab.com/store/bambulab-P1P-tech-specs.pdf',
        lastVerified: verified,
      },
      {
        label: 'Bambu Lab P1P end-of-sale announcement',
        url: 'https://blog.bambulab.com/a-farewell-to-p1p/',
        lastVerified: verified,
      },
    ],
    lastVerified: verified,
    published: false,
  },
  {
    id: 'bambu-lab-p1s',
    slug: 'bambu-lab-p1s',
    displayName: 'Bambu Lab P1S',
    status: PrinterStatus.Current,
    bestFor: 'enclosed CoreXY printing and access to a mature AMS ecosystem',
    buildVolumeMm: [256, 256, 256],
    machineDimensionsMm: [389, 389, 458],
    enclosed: true,
    maxNozzleTemperatureC: 300,
    maxBedTemperatureC: 100,
    maxClaimedSpeedMmS: 500,
    maxClaimedAccelerationMmS2: 20000,
    camera: 'Low-frame-rate 720p camera with timelapse',
    multicolour: 'Up to 16 colours with compatible AMS units',
    materials:
      'Ideal: PLA, PETG, TPU, PVA, PET, ABS and ASA. PA and PC are listed as capable.',
    indicativeUsdPrice: 699,
    priceDescription: 'Manufacturer store price observed; base printer only.',
    officialProductUrl: `${bambuStore}/collections/3d-printer/products/p1s`,
    sources: [p1Source],
    lastVerified: verified,
    published: true,
    editorialState: PrinterEditorialState.SpecResearch,
    summary:
      'An enclosed 256 mm CoreXY printer for users who need a controlled printing environment and AMS ecosystem.',
    strengths: ['Enclosed chamber', 'Current AMS compatibility'],
    limitations: [
      'Larger footprint than open-frame alternatives',
      'Accessory and bundle costs vary',
    ],
  },
  {
    id: 'bambu-lab-p2s',
    slug: 'p2s',
    displayName: 'Bambu Lab P2S',
    status: PrinterStatus.Current,
    bestFor:
      'an enclosed, more automated P-series printer with a modern interface',
    buildVolumeMm: [256, 256, 256],
    machineDimensionsMm: [392, 406, 478],
    enclosed: true,
    maxNozzleTemperatureC: 300,
    maxBedTemperatureC: 110,
    maxClaimedSpeedMmS: 600,
    maxClaimedAccelerationMmS2: 20000,
    camera: '1080p high-rate live view',
    multicolour:
      'P2S Combo includes AMS 2 Pro; add-on support varies by bundle and region',
    materials:
      'Use official material guidance for the selected nozzle and bundle. Its enclosure and higher bed limit can help with temperature-sensitive jobs.',
    indicativeUsdPrice: 549,
    priceDescription:
      'Launch starting price reported by Bambu Lab outside tax; US availability and pricing can vary.',
    officialProductUrl:
      'https://blog.bambulab.com/the-icon-redefined-meet-the-p2s-a-completely-reengineered-version-of-the-ultra-productive-p1-series/',
    sources: [
      {
        label: 'Bambu Lab P2S launch and specifications',
        url: 'https://blog.bambulab.com/the-icon-redefined-meet-the-p2s-a-completely-reengineered-version-of-the-ultra-productive-p1-series/',
        lastVerified: verified,
      },
    ],
    lastVerified: verified,
    published: true,
    editorialState: PrinterEditorialState.SpecResearch,
    summary:
      'A current enclosed P-series model with a 256 mm cube build volume and newer automation features.',
    strengths: [
      'Enclosed 256 mm cube platform',
      'Higher stated bed-temperature limit than P1S',
    ],
    limitations: [
      'Pricing and bundles vary by region',
      'Build volume is unchanged from P1S',
    ],
  },
  ...[
    [
      'bambu-lab-x1-carbon',
      'bambu-lab-x1-carbon',
      'Bambu Lab X1 Carbon',
      [256, 256, 256],
      true,
      1449,
      'Premium enclosed CoreXY printer with AMS-ready multicolour workflow.',
      'https://us.store.bambulab.com/products/x1-carbon',
      'For users who value its enclosed platform, sensors and established AMS workflow.',
    ],
    [
      'prusa-core-one',
      'prusa-core-one',
      'Original Prusa CORE One',
      [250, 220, 270],
      true,
      1199,
      'Enclosed CoreXY printer from Prusa with a distinctive 250 x 220 x 270 mm build volume.',
      'https://www.prusa3d.com/product/original-prusa-core-one/',
      'For makers who prefer Prusa hardware, serviceability and an enclosed CoreXY layout.',
    ],
    [
      'prusa-mk4s',
      'prusa-mk4s',
      'Original Prusa MK4S',
      [250, 210, 220],
      false,
      799,
      'Open-frame Prusa bed-slinger with a 250 x 210 x 220 mm build volume.',
      'https://www.prusa3d.com/product/original-prusa-mk4s-3d-printer-kit/',
      'For users who value a documented, repairable open-frame Prusa workflow.',
    ],
    [
      'creality-k1c',
      'creality-k1c',
      'Creality K1C',
      [220, 220, 250],
      true,
      549,
      'Enclosed Creality CoreXY model with a 220 x 220 x 250 mm stated build volume.',
      'https://store.creality.com/products/creality-k1c-3d-printer',
      'For a compact enclosed CoreXY option where its material guidance fits the job.',
    ],
    [
      'elegoo-neptune-4-plus',
      'elegoo-neptune-4-plus',
      'Elegoo Neptune 4 Plus',
      [320, 320, 385],
      false,
      429,
      'Large-format open-frame Elegoo FDM printer with a 320 x 320 x 385 mm stated build volume.',
      'https://us.elegoo.com/products/neptune-4-plus-fdm-3d-printer',
      'For larger common-material parts when an open frame is acceptable.',
    ],
    [
      'sovol-sv06-ace',
      'sovol-sv06-ace',
      'Sovol SV06 ACE',
      [220, 220, 250],
      false,
      299,
      'Value-focused open-frame FDM printer with a 220 x 220 x 250 mm stated build volume.',
      'https://sovol3d.com/products/sovol-sv06-ace-3d-printer',
      'For cost-conscious common-material printing with a conventional build size.',
    ],
  ].map(
    ([
      id,
      slug,
      displayName,
      volume,
      enclosed,
      price,
      summary,
      url,
      bestFor,
    ]) => ({
      id: id as string,
      slug: slug as string,
      displayName: displayName as string,
      status: PrinterStatus.Current,
      bestFor: bestFor as string,
      buildVolumeMm: volume as unknown as readonly [number, number, number],
      machineDimensionsMm: volume as unknown as readonly [
        number,
        number,
        number,
      ],
      enclosed: enclosed as boolean,
      maxNozzleTemperatureC: 300,
      maxBedTemperatureC: 100,
      maxClaimedSpeedMmS: 0,
      maxClaimedAccelerationMmS2: 0,
      camera:
        'See the manufacturer documentation for the current configuration.',
      multicolour:
        'See the manufacturer documentation for compatible accessories.',
      materials:
        'Follow the printer and filament manufacturer guidance for the selected material and enclosure conditions.',
      indicativeUsdPrice: price as number,
      priceDescription:
        'Indicative manufacturer-listing price observed; configurations and tax can vary.',
      officialProductUrl: url as string,
      sources: [
        {
          label: `${displayName} official product page`,
          url: url as string,
          lastVerified: verified,
        },
      ],
      lastVerified: verified,
      published: true,
      editorialState: PrinterEditorialState.SpecResearch,
      summary: summary as string,
      strengths: [
        'Published build-volume information',
        'Official specification source recorded',
      ],
      limitations: [
        'Maximum performance figures are not InspectMesh test results',
        'Confirm bundle contents and current availability with the manufacturer',
      ],
    }),
  ),
];

export const printersById = new Map(
  printers.map((printer) => [printer.id, printer]),
);
export const printersBySlug = new Map(
  printers.map((printer) => [printer.slug, printer]),
);

export function printerById(id: string): PrinterRecord {
  const printer = printersById.get(id);
  if (!printer) {
    throw new Error(`Unknown printer id: ${id}`);
  }
  return printer;
}
