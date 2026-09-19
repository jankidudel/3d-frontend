export const PrinterStatus = {
  Current: 'current',
  Discontinued: 'discontinued',
} as const;

export type PrinterStatus = (typeof PrinterStatus)[keyof typeof PrinterStatus];

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
  },
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
