import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { BatchPage } from './batch-page';
import { exampleFile, exampleMesh, MeshExample } from './example-meshes';
import { checkGeometry, QueueState } from './mesh-workflows';
import { MeshWorkerRequest, MeshWorkerResult } from './mesh-worker';
import { ReviewSession } from './review-session';

describe('bounded collection queue', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    class TestWorker {
      onmessage: ((event: MessageEvent<MeshWorkerResult>) => void) | null =
        null;
      onerror: (() => void) | null = null;
      terminate(): void {}
      postMessage(request: MeshWorkerRequest): void {
        if (request.mode === 'check') {
          const check = checkGeometry(
            request.mesh,
            request.settings,
            request.scale,
          );
          queueMicrotask(() =>
            this.onmessage?.({
              data: { check },
            } as MessageEvent<MeshWorkerResult>),
          );
        }
      }
    }
    vi.stubGlobal('Worker', TestWorker);
  });
  afterEach(() => vi.unstubAllGlobals());
  it('processes a deterministic mixed queue and replaces one revision without discarding others', async () => {
    const page = TestBed.createComponent(BatchPage).componentInstance;
    await page.process([
      new File(['broken'], 'z-malformed.stl'),
      exampleFile(MeshExample.Open),
      exampleFile(MeshExample.Cube),
    ]);
    expect(page.rows().map((r) => r.name)).toEqual([
      'closed-20mm-cube.stl',
      'open-face-cube.stl',
      'z-malformed.stl',
    ]);
    expect(page.rows().map((r) => r.state)).toEqual([
      QueueState.Complete,
      QueueState.Complete,
      QueueState.Failed,
    ]);
    const preserved = page.rows()[1];
    await page.replaceFile(0, {
      target: { files: [exampleFile(MeshExample.Changed)], value: '' },
    } as unknown as Event);
    expect(page.rows()[0].result?.dimensionsMm.width).toBe(24);
    expect(page.rows()[1]).toBe(preserved);
    expect(page.rows()[2].state).toBe(QueueState.Failed);
    const retained = TestBed.inject(ReviewSession).collection;
    expect(retained?.rows).toEqual(page.rows());
    expect(retained?.files).toHaveLength(3);
  });
  it('cancels remaining checks and preserves completed findings', async () => {
    const page = TestBed.createComponent(BatchPage).componentInstance;
    let posted = 0;
    class CancellingWorker {
      onmessage: ((event: MessageEvent<MeshWorkerResult>) => void) | null =
        null;
      onerror: (() => void) | null = null;
      terminate(): void {}
      postMessage(request: MeshWorkerRequest): void {
        posted++;
        if (posted === 2) {
          queueMicrotask(() => page.cancel());
          return;
        }
        if (request.mode === 'check') {
          const check = checkGeometry(exampleMesh(), request.settings);
          queueMicrotask(() =>
            this.onmessage?.({
              data: { check },
            } as MessageEvent<MeshWorkerResult>),
          );
        }
      }
    }
    vi.stubGlobal('Worker', CancellingWorker);
    await page.process([
      exampleFile(MeshExample.Cube),
      exampleFile(MeshExample.Open),
      exampleFile(MeshExample.Changed),
    ]);
    expect(page.rows()[0].state).toBe(QueueState.Complete);
    expect(page.rows()[1].state).toBe(QueueState.Cancelled);
    expect(page.rows()[2].state).toBe(QueueState.Cancelled);
    expect(posted).toBe(2);
    expect(page.busy()).toBe(false);
  });
});
