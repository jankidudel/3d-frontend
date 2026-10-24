import { describe, expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  inspectMesh,
  meshDimensions,
} from '../src/app/features/stl-print-preflight/stl-print-preflight-analysis';
import {
  analyseWallThickness,
  WallThicknessUnit,
} from '../src/app/features/shared/wall-thickness/wall-thickness-analysis';
import {
  readStl,
  simplify,
  writeBinaryStl,
} from '../src/app/features/stl-reducer/stl-reducer';
import { calculatePrintCost } from '../src/app/features/print-cost/print-cost';

const examples = resolve(import.meta.dirname, '../public/examples');
const file = async (path: string) =>
  new File([await readFile(resolve(examples, path))], path.split('/').at(-1)!);

describe('reproducible recovery controls', () => {
  it('replays actual topology, volume and sampled-wall results for the visible preflight example', async () => {
    const controls = [];
    for (const name of ['closed-20mm-cube.stl', 'open-face-cube.stl']) {
      const source = await file('english-market-batch/' + name);
      const mesh = await readStl(source);
      const walls = analyseWallThickness(
        mesh,
        1.2,
        WallThicknessUnit.Millimetres,
      );
      controls.push({
        name,
        assumedUnit: 'mm',
        triangles: mesh.indices.length / 3,
        dimensions: meshDimensions(mesh),
        topology: inspectMesh(mesh),
        walls: walls
          ? {
              attempted: walls.samples.length,
              measured: walls.measured,
              unmeasured: walls.unmeasured,
              minimum: walls.minimum,
              belowThreshold: walls.belowThreshold,
              threshold: walls.threshold,
            }
          : null,
        printerFit: null,
      });
    }
    const path = resolve(examples, 'quality-evidence/local-preflight.json');
    if (process.env['INSPECTMESH_REFRESH_EVIDENCE'] === '1') {
      await writeFile(
        path,
        JSON.stringify(
          {
            method:
              'Actual browser algorithms run locally in Vitest; no selected printer; 1.2 mm wall review threshold; not physical-print evidence.',
            controls,
          },
          null,
          2,
        ) + '\n',
      );
    }
    expect(controls).toEqual(JSON.parse(await readFile(path, 'utf8')).controls);
    expect(controls[0].topology.volume).toBe(8000);
    expect(controls[1].topology.openEdges).toBe(4);
    expect(controls[1].topology.volume).toBeNull();
  });

  it('reproduces curved output from the retained original and checks actual serialized counts and bounds', async () => {
    const provenance = JSON.parse(
      await readFile(
        resolve(examples, 'quality-evidence/provenance.json'),
        'utf8',
      ),
    );
    const source = await readStl(
      await file('quality-evidence/keyed-cylinder-100.stl'),
    );
    for (const candidate of provenance.reductions) {
      const actual = await readFile(
        resolve(examples, 'quality-evidence', candidate.name),
      );
      expect(createHash('sha256').update(actual).digest('hex')).toBe(
        candidate.sha256,
      );
      const mesh = await readStl(
        await file('quality-evidence/' + candidate.name),
      );
      expect(actual.length).toBe(candidate.bytes);
      expect(mesh.indices.length / 3).toBe(candidate.triangles);
      const dimensions = meshDimensions(mesh);
      expect([dimensions.width, dimensions.height, dimensions.depth]).toEqual(
        candidate.bounds.map((axis: { span: number }) => axis.span),
      );
      if (candidate.requestedKeepPercent < 100) {
        const regenerated = await simplify(
          source,
          candidate.requestedKeepPercent,
        );
        const serialized = new Uint8Array(
          await writeBinaryStl(regenerated).arrayBuffer(),
        );
        expect(createHash('sha256').update(serialized).digest('hex')).toBe(
          candidate.sha256,
        );
      }
    }
  });

  it('keeps subtotal and budgeting uplift distinct from selling price', () => {
    const values = {
      filamentWeightGrams: 100,
      spoolWeightGrams: 1000,
      spoolPrice: 20,
      printHours: 5,
      printerWatts: 120,
      electricityPrice: 0.25,
      machineHourlyCost: 0,
      labourHourlyCost: 12,
      labourHours: 0.25,
      extraPartsCost: 0,
      packagingCost: 0,
      shippingCost: 0,
      failureAllowancePercent: 0,
      targetMarginPercent: 0,
      marketplaceFeePercent: 0,
      marketplaceFixedFee: 0,
      desiredSellingPrice: null,
      salesTaxPercent: 0,
    };
    const result = calculatePrintCost(values)!;
    expect(result.materialCost).toBe(2);
    expect(result.electricityCost).toBeCloseTo(0.15);
    expect(result.labourCost).toBe(3);
    expect(result.totalCost).toBeCloseTo(5.15);
    const budget = calculatePrintCost({
      ...values,
      failureAllowancePercent: 10,
    })!;
    expect(budget.failureAllowance).toBeCloseTo(0.515);
    expect(budget.totalCost).toBeCloseTo(5.665);
  });
});
