import { vi } from 'vitest';
import { runMeshWorker, MeshWorkerMode } from './mesh-worker';
import { exampleMesh, MeshExample } from './example-meshes';
import { ModelUnits } from './mesh-workflows';

describe('mesh worker cancellation', () => {
  const request = {
    mode: MeshWorkerMode.Check,
    mesh: exampleMesh(MeshExample.Cube),
    settings: {
      stlUnit: ModelUnits.Millimetres,
      printer: null,
      thicknessThresholdMm: 1.2,
    },
    scale: 1,
  } as const;
  afterEach(() => vi.unstubAllGlobals());
  it('terminates an active worker and rejects instead of returning a partial successful result', async () => {
    const terminated = vi.fn();
    class TestWorker {
      terminate = terminated;
      postMessage = vi.fn();
    }
    vi.stubGlobal('Worker', TestWorker);
    const controller = new AbortController();
    const pending = runMeshWorker(request, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(terminated).toHaveBeenCalledOnce();
  });
  it('honours an already cancelled request without posting model data', async () => {
    const post = vi.fn();
    class TestWorker {
      terminate = vi.fn();
      postMessage = post;
    }
    vi.stubGlobal('Worker', TestWorker);
    const controller = new AbortController();
    controller.abort();
    await expect(
      runMeshWorker(request, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(post).not.toHaveBeenCalled();
  });
});
