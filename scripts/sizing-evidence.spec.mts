import '@angular/compiler';
import { describe, expect, it, vi } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { unzipSync } from 'fflate';
import { LocalConverterPage } from '../src/app/features/converters/local-converter-page';
import {
  readStl,
  writeBinaryStl,
} from '../src/app/features/stl-reducer/stl-reducer';
import {
  dimensionsOf,
  scaleMesh,
  targetDimensionScale,
  ScaleUnit,
} from '../src/app/features/stl-scale/stl-scale';
import {
  inspectMesh,
  meshDimensions,
} from '../src/app/features/stl-print-preflight/stl-print-preflight-analysis';
import { resolveThreeMfWallGeometry } from '../src/app/features/shared/wall-thickness/three-mf-wall-thickness';
import {
  calculateJobCost,
  workedJob,
} from '../src/app/features/print-cost/job-cost';
import {
  calculatePrintPrice,
  PricingMethod,
} from '../src/app/features/print-price/print-price';
import { quotationPricingInput } from '../src/app/features/quotation/quotation-test-fixtures';

const directory = resolve(
  import.meta.dirname,
  '../public/examples/quality-evidence',
);
const refresh = process.env['INSPECTMESH_REFRESH_EVIDENCE'] === '1';
const hash = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
const tolerance = 0.00001;

describe('sizing and job evidence from actual serialized outputs', () => {
  it('reopens the asymmetric control, scaled download and actual converter package', async () => {
    const cubeBytes = await readFile(
      resolve(directory, '../english-market-batch/closed-20mm-cube.stl'),
    );
    const cube = await readStl(new File([cubeBytes], 'source.stl'));
    const original = { ...cube, positions: cube.positions.slice() };
    for (let index = 0; index < original.positions.length; index += 3) {
      original.positions[index] *= 2;
      original.positions[index + 2] *= 0.5;
    }
    const sourceBytes = new Uint8Array(
      await writeBinaryStl(original).arrayBuffer(),
    );
    const source = await readStl(
      new File([sourceBytes], 'size-block-original.stl'),
    );
    expect(dimensionsOf(source)).toEqual({ width: 40, depth: 20, height: 10 });
    expect(inspectMesh(source).volume).toBeCloseTo(8000, 8);
    const factor = targetDimensionScale(
      dimensionsOf(source)!,
      'width',
      60,
      ScaleUnit.Millimetres,
    )!;
    expect(factor).toBe(1.5);
    const saved = new Uint8Array(
      await writeBinaryStl(scaleMesh(source, factor)!).arrayBuffer(),
    );
    const reopened = await readStl(new File([saved], 'size-block-scaled.stl'));
    expect(dimensionsOf(reopened)).toEqual({
      width: 60,
      depth: 30,
      height: 15,
    });
    expect(reopened.indices.length / 3).toBe(12);
    expect(inspectMesh(reopened).volume).toBeCloseTo(27000, 8);
    const half = scaleMesh(source, 0.5)!;
    expect(dimensionsOf(half)).toEqual({ width: 20, depth: 10, height: 5 });
    const rotated = { ...source, positions: source.positions.slice() };
    for (let index = 0; index < rotated.positions.length; index += 3) {
      const x = source.positions[index];
      const y = source.positions[index + 1];
      rotated.positions[index] = (x - y) / Math.sqrt(2);
      rotated.positions[index + 1] = (x + y) / Math.sqrt(2);
    }
    expect(dimensionsOf(rotated)!.width).toBeCloseTo(60 / Math.sqrt(2), 5);
    expect(dimensionsOf(rotated)!.depth).toBeCloseTo(60 / Math.sqrt(2), 5);
    expect(dimensionsOf(rotated)!.height).toBe(10);
    // Exercise the existing private writer without creating a second conversion algorithm.
    const writer = LocalConverterPage.prototype as unknown as {
      stlToThreeMf: (
        this: { status: { set: (value: string) => void } },
        file: File,
        unit: string,
      ) => Promise<{ bytes: Uint8Array }>;
    };
    const dom = new JSDOM();
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('DOMParser', dom.window.DOMParser);
    try {
      const converted = await writer.stlToThreeMf.call(
        { status: { set: () => {} } },
        new File([sourceBytes], 'size-block-original.stl'),
        'millimeter',
      );
      const resolved = await resolveThreeMfWallGeometry(
        converted.bytes.slice().buffer,
      );
      expect(resolved.declaredUnit).toBe('millimeter');
      expect(resolved.items).toHaveLength(1);
      expect(resolved.geometry.indices.length / 3).toBe(12);
      const dimensions = meshDimensions(resolved.geometry);
      expect(dimensions).toEqual({ width: 40, height: 20, depth: 10 });
      for (const [name, bytes] of [
        ['size-block-original.stl', sourceBytes],
        ['size-block-scaled.stl', saved],
        ['size-block-converted.3mf', converted.bytes],
      ] as const) {
        const path = resolve(directory, name);
        if (refresh) {
          await writeFile(path, bytes);
        }
        const retained = await readFile(path);
        if (name.endsWith('.3mf')) {
          expect(unzipSync(retained)).toEqual(unzipSync(bytes));
        } else {
          expect(retained).toEqual(Buffer.from(bytes));
        }
      }
      const distributed = await readFile(
        resolve(directory, 'size-block-converted.3mf'),
      );
      const controls = {
        source: {
          path: '/examples/quality-evidence/size-block-original.stl',
          sha256: hash(sourceBytes),
          spansXyzMm: [40, 20, 10],
          triangles: 12,
          volumeMm3: 8000,
        },
        scaled: {
          path: '/examples/quality-evidence/size-block-scaled.stl',
          sha256: hash(saved),
          factor,
          spansXyzMm: [60, 30, 15],
          triangles: 12,
          volumeMm3: 27000,
        },
        converted: {
          path: '/examples/quality-evidence/size-block-converted.3mf',
          sha256: hash(distributed),
          declaredUnit: resolved.declaredUnit,
          placedItems: resolved.items.length,
          spansXyzMm: [40, 20, 10],
          triangles: 12,
        },
      };
      const observationPath = resolve(directory, 'sizing-observation.json');
      if (refresh) {
        const implementations = [];
        for (const relative of [
          'src/app/features/stl-scale/stl-scale.ts',
          'src/app/features/stl-reducer/stl-reducer.ts',
          'src/app/features/converters/local-converter-page.ts',
          'src/app/features/shared/wall-thickness/three-mf-wall-thickness.ts',
        ]) {
          implementations.push({
            path: relative,
            sha256: hash(
              await readFile(resolve(directory, '../../..', relative)),
            ),
          });
        }
        await writeFile(
          observationPath,
          JSON.stringify(
            {
              observedDate: '2026-10-26',
              sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], {
                encoding: 'utf8',
              }).trim(),
              sourceState:
                'Main checkout with page-clarity edits; existing geometry and conversion algorithms unchanged.',
              rights:
                'Owned numerical block derived from the InspectMesh cube control; CC0-1.0.',
              method:
                'Actual local STL scale/serialization and STL-to-3MF writer, followed by reopen through existing parsers. The converted package is generated output, not a hand-authored reference.',
              reproduction:
                'INSPECTMESH_REFRESH_EVIDENCE=1 npx vitest run scripts/sizing-evidence.spec.mts',
              software: {
                node: process.version,
                vitest: '4.1.11',
                three: '0.185.1',
              },
              toleranceMm: tolerance,
              limitations:
                'Designed millimetre assumption for unitless STL. Not a browser interaction, receiving-slicer, server or physical-print observation. Rotated and half-size values are analytical expectations separately checked against local geometry.',
              implementations,
              controls,
            },
            null,
            2,
          ) + '\n',
        );
      }
      const observation = JSON.parse(await readFile(observationPath, 'utf8'));
      expect(observation.controls).toEqual(controls);
      expect(observation.toleranceMm).toBe(tolerance);
    } finally {
      vi.unstubAllGlobals();
      dom.window.close();
    }
  });

  it('compares the job and every price scenario with independent fixed expectations', async () => {
    const expected = {
      material: 3.84,
      energy: 0.252,
      machine: 14,
      preparation: 6,
      handling: 6,
      finishing: 7.5,
      packaging: 1.6,
      total: 39.192,
      average: 7.8384,
      uplift10Percent: 43.1112,
      prices: [
        55.98857142857143, 50.9496, 60.29538461538462, 53.63115789473685, 65,
      ],
      minimumFee: 3.25,
      minimumProfit: 22.558,
      minimumMarginPercent: 34.704615384615386,
    };
    const job = calculateJobCost(workedJob())!;
    for (const field of [
      'material',
      'energy',
      'machine',
      'preparation',
      'handling',
      'finishing',
      'packaging',
      'total',
    ] as const) {
      expect(job[field]).toBeCloseTo(expected[field], 10);
    }
    expect(job.allocatedAverage).toBeCloseTo(expected.average, 10);
    expect(
      calculateJobCost({ ...workedJob(), failurePercent: 10 })!.total,
    ).toBeCloseTo(expected.uplift10Percent, 10);
    const scenarios = [
      {
        pricingMethod: PricingMethod.Margin,
        sellingFeePercent: 0,
        minimumOrderCharge: 0,
      },
      {
        pricingMethod: PricingMethod.Markup,
        sellingFeePercent: 0,
        minimumOrderCharge: 0,
      },
      {
        pricingMethod: PricingMethod.Margin,
        sellingFeePercent: 5,
        minimumOrderCharge: 0,
      },
      {
        pricingMethod: PricingMethod.Markup,
        sellingFeePercent: 5,
        minimumOrderCharge: 0,
      },
      {
        pricingMethod: PricingMethod.Margin,
        sellingFeePercent: 5,
        minimumOrderCharge: 65,
      },
    ];
    const actual = scenarios.map((scenario) =>
      calculatePrintPrice({ ...quotationPricingInput(), ...scenario })!,
    );
    actual.forEach((result, index) =>
      expect(result.orderQuote).toBeCloseTo(expected.prices[index], 10),
    );
    expect(actual[4].sellingFeesForOrder).toBe(expected.minimumFee);
    expect(actual[4].grossProfitForOrder).toBeCloseTo(
      expected.minimumProfit,
      10,
    );
    expect(actual[4].realisedMarginPercent).toBeCloseTo(
      expected.minimumMarginPercent,
      10,
    );
    const recordPath = resolve(directory, 'job-pricing-control.json');
    const record = {
      classification:
        'Fictional independent expected arithmetic, compared with local software; not production observations or market rates.',
      inputs: workedJob(),
      expected,
      observed: { job, prices: actual },
    };
    if (refresh) {
      await writeFile(recordPath, JSON.stringify(record, null, 2) + '\n');
    }
    expect(JSON.parse(await readFile(recordPath, 'utf8'))).toEqual(record);
  });
});

// Real export, using bundled fonts; optional local captures support visual QA.
describe('actual quotation document and private archive', () => {
  it('paginates long scope and keeps private assumptions in the editable archive only', async () => {
    const {
      sampleQuotation,
      customerQuotation,
      serializeQuotation,
      parseQuotation,
      QuoteSource,
    } = await import('../src/app/features/quotation/quotation');
    const { quotationOffer } =
      await import('../src/app/features/quotation/quotation-test-fixtures');
    const { createQuotationPdf } =
      await import('../src/app/features/quotation/quotation-pdf');
    const scope =
      'Fictional scope: five prototype spacers; agreed support removal, source revision r2 and no design changes. ';
    const draft = {
      ...sampleQuotation(),
      issueDate: '2026-10-26',
      versionNumber: 2,
      parentVersionNumber: 1,
      parentVersionId: crypto.randomUUID(),
      changeSummary:
        'Fictional revision: scope clarified; geometry remains r2.',
      agreedScope: scope.repeat(35),
      reviewed: true,
      internal: quotationOffer(),
      source: QuoteSource.Calculator,
    };
    const document = customerQuotation(draft)!;
    expect(document).not.toBeNull();
    expect(document.versionNumber).toBe(2);
    expect(document.revision).toBe('r2');
    expect(document.totalCents).toBe(6030);
    expect(document).not.toHaveProperty('internal');
    expect(document).not.toHaveProperty('assumptions');
    const archive = serializeQuotation(draft);
    const restored = parseQuotation(archive);
    expect(restored.internal!.assumptions.jobProductionCost).toBe(39.192);
    expect(restored.internal!.assumptions.targetMarginPercent).toBe(30);
    expect(restored.reviewed).toBe(false);
    const fonts = {
      regular: (
        await readFile(
          resolve(
            directory,
            '../../fonts/quotation/LiberationSans-Regular.ttf',
          ),
        )
      ).toString('base64'),
      bold: (
        await readFile(
          resolve(directory, '../../fonts/quotation/LiberationSans-Bold.ttf'),
        )
      ).toString('base64'),
    };
    const pdf = await createQuotationPdf(document, fonts);
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
    const bytes = new Uint8Array(pdf.output('arraybuffer'));
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    const reviewDirectory = process.env['INSPECTMESH_QUOTATION_REVIEW_DIR'];
    if (reviewDirectory) {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(reviewDirectory, { recursive: true });
      await writeFile(
        resolve(reviewDirectory, 'customer-quotation.pdf'),
        bytes,
      );
      await writeFile(
        resolve(reviewDirectory, 'private-quotation.json'),
        archive,
      );
    }
  });
});
