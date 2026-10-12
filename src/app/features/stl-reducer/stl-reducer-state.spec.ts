import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { StlReducerPage } from './stl-reducer-page';
import {
  reviewedCandidate,
  ReductionMethod,
  ComparisonState,
} from './candidate-review';
import { readStl } from './stl-reducer';
import { exampleFile, MeshExample } from '../repeat-workflows/example-meshes';
import { ModelUnits } from '../repeat-workflows/mesh-workflows';

describe('candidate lifecycle and reports', () => {
  const create = () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(StlReducerPage);
    const instance = fixture.componentInstance;
    vi.spyOn(
      instance as unknown as { showPreview: () => Promise<void> },
      'showPreview',
    ).mockResolvedValue(undefined);
    return { fixture, instance };
  };
  it('keeps three independent original-based candidates, explicit replacement and exact download', async () => {
    const { fixture, instance } = create();
    const file = exampleFile(MeshExample.Cube);
    const original = await readStl(file);
    instance.file.set(file);
    instance.source.set(original);
    const run = vi
      .spyOn(
        instance as unknown as {
          runWorker: (request: {
            source: typeof original;
            method: ReductionMethod;
            keepPercent: number;
          }) => Promise<unknown>;
        },
        'runWorker',
      )
      .mockImplementation(async (request) => ({
        candidate: await reviewedCandidate(
          request.source,
          request.method,
          request.keepPercent,
        ),
      }));
    instance.mode.set(ReductionMethod.Reduction);
    for (const percent of [75, 50, 25, 10]) {
      instance.keepPercent.set(percent);
      await instance.process();
    }
    expect(instance.candidates()).toHaveLength(3);
    expect(run).toHaveBeenCalledTimes(3);
    expect(
      run.mock.calls.every(([request]) => request.source === original),
    ).toBe(true);
    const selected = instance.result()!;
    const save = vi
      .spyOn(
        instance as unknown as { save: (blob: Blob, name: string) => void },
        'save',
      )
      .mockImplementation(() => {});
    instance.download();
    expect(save.mock.calls[0][0]).toBe(selected.blob);
    instance.exportReport();
    const json = JSON.parse(await save.mock.calls[1][0].text());
    expect(json.output.bytes).toBe(selected.blob.size);
    expect(json.output.triangles).toBe(selected.mesh.indices.length / 3);
    expect(typeof json.output.bounds.max[0]).toBe('number');
    instance.removeCandidate(selected.id);
    expect(instance.result()).toBeNull();
    await instance.process();
    expect(instance.candidates()).toHaveLength(3);
    expect(instance.source()).toBe(original);
    fixture.destroy();
  });
  it('suppresses old generation responses after source reset and cancellation', async () => {
    const { fixture, instance } = create();
    const original = await readStl(exampleFile(MeshExample.Cube));
    instance.file.set(exampleFile(MeshExample.Cube));
    instance.source.set(original);
    let resolve!: (value: unknown) => void;
    vi.spyOn(
      instance as unknown as { runWorker: () => Promise<unknown> },
      'runWorker',
    ).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const pending = instance.process();
    instance.reset();
    resolve({
      candidate: await reviewedCandidate(
        original,
        ReductionMethod.Encoding,
        100,
      ),
    });
    await pending;
    expect(instance.candidates()).toEqual([]);
    expect(instance.result()).toBeNull();
    expect(instance.file()).toBeNull();
    expect(instance.processing()).toBe(false);
    fixture.destroy();
  });
  it('requires diagnostic acknowledgement, clears dependent evidence, and retains numerical JSON', async () => {
    const { fixture, instance } = create();
    const original = await readStl(exampleFile(MeshExample.Cube));
    instance.file.set(exampleFile(MeshExample.Cube));
    instance.source.set(original);
    const output = await reviewedCandidate(
      original,
      ReductionMethod.Encoding,
      100,
    );
    const candidate = {
      ...output,
      regressions: ['openEdges'],
      id: 1,
      sourceId: 0,
      comparisonState: ComparisonState.Completed,
      comparison: null,
      comparisonError: '',
      unit: ModelUnits.Millimetres,
      acknowledged: false,
      notes: '',
    };
    instance.candidates.set([candidate]);
    instance.result.set(candidate);
    const save = vi
      .spyOn(
        instance as unknown as { save: (blob: Blob, name: string) => void },
        'save',
      )
      .mockImplementation(() => {});
    instance.download();
    expect(save).not.toHaveBeenCalled();
    instance.updateCandidate({ acknowledged: true });
    instance.download();
    expect(save.mock.calls[0][1]).toContain('diagnostic');
    instance.changeUnit({
      target: { value: ModelUnits.Inches },
    } as unknown as Event);
    expect(instance.result()!.comparisonState).toBe(ComparisonState.NotRun);
    instance.changeTolerance({
      target: { value: '0.0000001' },
    } as unknown as Event);
    expect(instance.tolerance()).toBe(1e-7);
    expect(instance.report()!.source.assumedUnit).toBe(ModelUnits.Inches);
    fixture.destroy();
  });
  it('does not limit a custom triangle count to 99', () => {
    const { fixture, instance } = create();
    instance.source.set({
      encoding: 'binary STL',
      positions: new Float32Array([0, 0, 0]),
      indices: new Uint32Array(600),
    });
    instance.setCustom({ target: { value: '150' } } as unknown as Event);
    expect(instance.error()).toBe('');
    expect(instance.keepPercent()).toBe(75);
    fixture.destroy();
  });
});
