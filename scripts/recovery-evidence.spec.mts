import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { strToU8, unzipSync, zipSync } from 'fflate';
import {
  analyseThreeMfForRepair,
  repairThreeMfLocally,
} from '../src/app/features/three-mf/three-mf-local-repair';
import { describe, expect, it, vi } from 'vitest';
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

// Replay exact distributed bytes, then compare the regenerated package payloads.
// The observation is local software evidence, never a slicer or physical test.
describe('local 3MF cleanup preservation control', () => {
  it('reopens duplicate-only output and retains coordinates, resources, transforms and unrelated payloads', async () => {
    const dom = new JSDOM();
    vi.stubGlobal('DOMParser', dom.window.DOMParser);
    try {
      const original = new Uint8Array(
        await readFile(resolve(examples, 'cad-export/duplicate-face-cube.3mf')),
      );
      const sourceHash = createHash('sha256').update(original).digest('hex');
      const before = await analyseThreeMfForRepair(original);
      const result = await repairThreeMfLocally(before, {
        removeDuplicateTriangles: true,
        removeDegenerateTriangles: false,
        removeInvalidIndexTriangles: false,
      });
      const reopened = await analyseThreeMfForRepair(result.bytes);
      expect(createHash('sha256').update(original).digest('hex')).toBe(
        sourceHash,
      );
      expect(before.counts.triangles).toBe(13);
      expect(reopened.counts.triangles).toBe(12);
      expect(result.applied).toEqual({
        duplicateTriangles: 1,
        degenerateTriangles: 0,
        invalidIndexTriangles: 0,
      });
      const sourceParts = unzipSync(original);
      const savedParts = unzipSync(result.bytes);
      expect(Object.keys(savedParts).sort()).toEqual(
        Object.keys(sourceParts).sort(),
      );
      const modelPath = '3D/3dmodel.model';
      for (const name of Object.keys(sourceParts)) {
        if (name !== modelPath) {
          expect(savedParts[name]).toEqual(sourceParts[name]);
        }
      }
      const sourceModel = new TextDecoder().decode(sourceParts[modelPath]);
      const savedModel = new TextDecoder().decode(savedParts[modelPath]);
      const withoutTriangles = (xml: string) =>
        xml.replace(/<triangle\b[^>]*\/?\s*>/gi, '');
      expect(withoutTriangles(savedModel)).toBe(withoutTriangles(sourceModel));
      expect(Array.from(reopened.resolved.geometry.positions)).toEqual(
        Array.from(before.resolved.geometry.positions),
      );
      expect(reopened.packageInfo).toEqual(before.packageInfo);
      expect(reopened.resolved.buildItemCount).toBe(
        before.resolved.buildItemCount,
      );

      // One edited resource referenced twice still has two placements.
      const repeatedSource = new Uint8Array(
        await readFile(
          resolve(examples, 'collection-review/two-placed-cubes.3mf'),
        ),
      );
      const repeatedParts = unzipSync(repeatedSource);
      const repeatedXml = new TextDecoder().decode(repeatedParts[modelPath]);
      const firstTriangle = repeatedXml.match(/<triangle\b[^>]*\/?\s*>/i)![0];
      repeatedParts[modelPath] = strToU8(
        repeatedXml.replace('</triangles>', firstTriangle + '</triangles>'),
      );
      const repeatedBefore = await analyseThreeMfForRepair(
        zipSync(repeatedParts),
      );
      const repeatedAfter = await repairThreeMfLocally(repeatedBefore, {
        removeDuplicateTriangles: true,
        removeDegenerateTriangles: false,
        removeInvalidIndexTriangles: false,
      });
      expect(repeatedAfter.applied.duplicateTriangles).toBe(1);
      expect(repeatedAfter.after.resolved.buildItemCount).toBe(2);
      expect(repeatedAfter.after.resolved.geometry.positions).toEqual(
        repeatedBefore.resolved.geometry.positions,
      );
      expect(
        withoutTriangles(
          new TextDecoder().decode(unzipSync(repeatedAfter.bytes)[modelPath]),
        ),
      ).toBe(withoutTriangles(repeatedXml));
      const savedPath = resolve(
        examples,
        'quality-evidence/duplicate-cleaned.3mf',
      );
      if (process.env['INSPECTMESH_REFRESH_EVIDENCE'] === '1') {
        await writeFile(savedPath, result.bytes);
      }
      const retainedBytes = new Uint8Array(await readFile(savedPath));
      expect(unzipSync(retainedBytes)).toEqual(unzipSync(result.bytes));
      const controls = {
        fixture: '/examples/cad-export/duplicate-face-cube.3mf',
        sourceSha256: sourceHash,
        savedFile: '/examples/quality-evidence/duplicate-cleaned.3mf',
        savedSha256: createHash('sha256').update(retainedBytes).digest('hex'),
        settings: {
          removeDuplicateTriangles: true,
          removeDegenerateTriangles: false,
          removeInvalidIndexTriangles: false,
        },
        sourceCounts: before.counts,
        reopenedCounts: reopened.counts,
        applied: result.applied,
        declaredUnit: reopened.packageInfo.declaredUnit,
        buildItemsBefore: before.resolved.buildItemCount,
        buildItemsAfter: reopened.resolved.buildItemCount,
        unchangedCoordinates: true,
        unchangedNonTriangleXml: true,
        unchangedUnrelatedPayloads: true,
        repeatedResourceControl: {
          buildItems: 2,
          resourceDuplicateRemovals: 1,
          unchangedCoordinatesAndBuildXml: true,
        },
      };
      const path = resolve(
        examples,
        'quality-evidence/repair-observation.json',
      );
      if (process.env['INSPECTMESH_REFRESH_EVIDENCE'] === '1') {
        await writeFile(
          path,
          JSON.stringify(
            {
              method:
                'Browser-local 3MF repair replayed in Vitest/JSDOM; exact saved bytes reopened through the existing resolver. Not receiving-slicer, production-endpoint or physical-print evidence.',
              observedDate: '2026-10-25',
              sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], {
                encoding: 'utf8',
              }).trim(),
              sourceState:
                'Working tree with diagnosis/trust copy and UI edits; repair and resolver implementation unchanged from this revision.',
              repairImplementationSha256: createHash('sha256')
                .update(
                  await readFile(
                    resolve(
                      import.meta.dirname,
                      '../src/app/features/three-mf/three-mf-local-repair.ts',
                    ),
                  ),
                )
                .digest('hex'),
              reproduction: 'npm run test:seo-recovery',
              limitations:
                'Removal-plan edge keys are source indexes across the model part and skip duplicate/degenerate/invalid-index records; they are not the server topology method. Reopen assignments/settings in the receiving application.',
              controls,
            },
            null,
            2,
          ) + '\n',
        );
      }
      const observation = JSON.parse(await readFile(path, 'utf8'));
      expect(controls).toEqual(observation.controls);
      expect(observation.sourceRevision).toMatch(/^[a-f0-9]{40}$/);
    } finally {
      vi.unstubAllGlobals();
      dom.window.close();
    }
  });
});
