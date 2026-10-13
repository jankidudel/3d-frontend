import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { FloatingParts } from './floating-parts';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import { analyseParts, parsePartStl } from './disconnected-parts';
import {
  binaryFixture,
  cubeTriangles,
  demoTriangles,
  floatingPartsDemo,
} from './parts-fixtures';
import { PartsAction, type PartsResponse } from './parts-worker';
class TestWorker {
  static instances: TestWorker[] = [];
  onmessage: ((event: MessageEvent<PartsResponse>) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    TestWorker.instances.push(this);
  }
  reply(data: PartsResponse): void {
    this.onmessage?.({ data } as MessageEvent<PartsResponse>);
  }
}
function response(values = demoTriangles()): PartsResponse {
  const mesh = parsePartStl(binaryFixture(values));
  return {
    analysis: analyseParts(mesh),
    positions: new Float32Array(values),
    normals: new Float32Array(values.length),
  };
}
describe('optional STL part removal lifecycle', () => {
  beforeEach(() => {
    TestWorker.instances = [];
    vi.stubGlobal('Worker', TestWorker);
    vi.spyOn(
      ObjectViewerComponent.prototype as unknown as {
        render: () => Promise<void>;
      },
      'render',
    ).mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllGlobals());
  const create = () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(FloatingParts);
    fixture.componentRef.setInput('file', floatingPartsDemo());
    fixture.detectChanges();
    return {
      fixture,
      instance: fixture.componentInstance,
      worker: TestWorker.instances.at(-1)!,
    };
  };
  it('automatically detects without options, starts retained and keeps closed-panel selections visible and resettable', () => {
    const { fixture, instance, worker } = create();
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: PartsAction.Analyse }),
    );
    worker.reply(response());
    fixture.detectChanges();
    expect(instance.open()).toBe(false);
    expect(instance.removed().size).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('3 separate pieces');
    instance.review();
    fixture.detectChanges();
    instance.inspectPart(instance.analysis()!.parts[1]);
    fixture.detectChanges();
    const keep = fixture.nativeElement.querySelector(
      '.selected-piece input',
    ) as HTMLInputElement;
    expect(keep.checked).toBe(true);
    keep.click();
    fixture.detectChanges();
    expect(instance.removed().has(1)).toBe(true);
    instance.closeReview();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Removal selections are pending',
    );
    expect(instance.keptTriangles()).toBe(16);
    instance.reset();
    expect(instance.keptTriangles()).toBe(20);
    fixture.destroy();
  });
  it('viewer clicks map to original faces, and preview visibility never changes export selection', () => {
    const { fixture, instance, worker } = create();
    worker.reply(response());
    instance.review();
    instance.toggle(1);
    instance.toggle(2);
    fixture.detectChanges();
    expect(instance.removed().size).toBe(2);
    expect(instance.keptTriangles()).toBe(12);
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    instance.cleanedPreview.set(true);
    fixture.detectChanges();
    expect(instance.removed().size).toBe(2);
    instance.onTriangle(0);
    fixture.detectChanges();
    expect(instance.inspected()).toBe(0);
    expect(instance.isolated()).toBeNull();
    expect(instance.keptTriangles()).toBe(12);
    instance.isolateSelected();
    expect(instance.isolated()).toBe(0);
    instance.showSelectedInModel();
    expect(instance.isolated()).toBeNull();
    instance.showWholeModel();
    expect(instance.isolated()).toBeNull();
    instance.toggle(0);
    fixture.detectChanges();
    expect(instance.keptTriangles()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain(
      'Keep at least one piece',
    );
    const download = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button) =>
        (button as HTMLButtonElement).textContent?.includes(
          'Download STL with kept pieces',
        ),
    ) as HTMLButtonElement;
    expect(download.disabled).toBe(true);
    instance.reset();
    fixture.destroy();
  });
  it('reviews pieces in area order while keeping selection on the full model', () => {
    const { fixture, instance, worker } = create();
    worker.reply(response());
    instance.review();
    fixture.detectChanges();
    expect(instance.selectedRank()).toBe(0);
    expect(instance.isolated()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'highlighted in blue on the full model',
    );
    instance.stepPart(1);
    fixture.detectChanges();
    expect(instance.selectedRank()).toBe(1);
    expect(instance.inspected()).toBe(instance.orderedParts()[1].id);
    expect(instance.removed().size).toBe(0);
    instance.toggle(instance.inspected()!);
    expect(instance.removed().size).toBe(1);
    instance.stepPart(-1);
    expect(instance.selectedRank()).toBe(0);
    expect(instance.removed().size).toBe(1);
    fixture.destroy();
  });
  it('opens the guided review after analysing a selected file', () => {
    const { fixture, instance, worker } = create();
    fixture.componentRef.setInput('autoReview', true);
    fixture.detectChanges();
    worker.reply(response());
    fixture.detectChanges();
    expect(instance.open()).toBe(true);
    expect(instance.selectedRank()).toBe(0);
    expect(instance.isolated()).toBeNull();
    fixture.destroy();
  });
  it('replaces file and cancellation discard stale responses, selection and worker resources', () => {
    const { fixture, instance, worker } = create();
    worker.reply(response());
    instance.toggle(1);
    fixture.componentRef.setInput(
      'file',
      new File([binaryFixture(cubeTriangles())], 'cube.stl'),
    );
    fixture.detectChanges();
    const next = TestWorker.instances.at(-1)!;
    expect(worker.terminate).toHaveBeenCalled();
    worker.reply(response());
    expect(instance.analysis()).toBeNull();
    next.reply(response(cubeTriangles()));
    expect(instance.analysis()?.parts).toHaveLength(1);
    expect(instance.removed().size).toBe(0);
    instance.cancel();
    next.reply(response());
    expect(instance.analysis()).toBeNull();
    expect(next.terminate).toHaveBeenCalled();
    fixture.destroy();
  });
  it('binds explicit exports to current selection and emits an explicit retained-file replacement', () => {
    const { fixture, instance, worker } = create();
    worker.reply(response());
    instance.toggle(1);
    instance.toggle(2);
    const save = vi
      .spyOn(instance as unknown as { save: (blob: Blob) => void }, 'save')
      .mockImplementation(() => {});
    const emit = vi.spyOn(instance.inspectRetained, 'emit');
    instance.download();
    expect(worker.postMessage).toHaveBeenLastCalledWith({
      action: PartsAction.Export,
      removed: [1, 2],
    });
    const blob = new Blob([binaryFixture(cubeTriangles())]);
    worker.reply({ blob });
    expect(save).toHaveBeenCalledWith(blob, null);
    instance.inspect();
    expect(emit.mock.calls[0][0].name).toBe(
      'cube-plus-two-fragments-selected-pieces.stl',
    );
    instance.download();
    instance.reset();
    worker.reply({ blob });
    expect(save).toHaveBeenCalledTimes(1);
    expect(instance.downloaded()).toBeNull();
    fixture.destroy();
  });
  it('exports only the inspected component with an explicit separate filename', () => {
    const { fixture, instance, worker } = create();
    worker.reply(response());
    instance.inspectPart(instance.analysis()!.parts[1]);
    instance.downloadPart();
    expect(worker.postMessage).toHaveBeenLastCalledWith({
      action: PartsAction.Export,
      removed: [],
      keepPartId: 1,
    });
    const save = vi
      .spyOn(
        instance as unknown as {
          save: (blob: Blob, id: number | null) => void;
        },
        'save',
      )
      .mockImplementation(() => {});
    const blob = new Blob([binaryFixture(demoTriangles().slice(0, 9 * 4))]);
    worker.reply({ blob, keepPartId: 1 });
    expect(save).toHaveBeenCalledWith(blob, 1);
    instance.inspect();
    expect(instance.downloadedPartId()).toBe(1);
    fixture.destroy();
  });
  it('one component has honest empty state and failures expose a retry', () => {
    const { fixture, instance, worker } = create();
    worker.reply(response(cubeTriangles()));
    instance.review();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'No disconnected pieces found',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'This tool does not generate supports',
    );
    const download = fixture.nativeElement.querySelector(
      '.download-bar button',
    ) as HTMLButtonElement;
    expect(download.disabled).toBe(true);
    worker.reply({ error: 'Zero-area faces - repair first' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Retry part analysis');
    fixture.destroy();
  });
  it('warns that several similarly sized pieces are not automatically waste', () => {
    const { fixture, worker } = create();
    const cubes = [0, 3, 6].flatMap((x) => cubeTriangles(1, [x, 0, 0]));
    worker.reply(response(cubes));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'No single piece dominates this model',
    );
    expect(fixture.nativeElement.textContent).toContain('33.3%');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Keep largest part',
    );
    fixture.destroy();
  });
});
