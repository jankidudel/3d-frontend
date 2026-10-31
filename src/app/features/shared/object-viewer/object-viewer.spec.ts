import { signal } from '@angular/core';
import { MeasurementPanel } from '../feature-measurement/measurement-panel';
import {
  SelectionBasis,
  type MeasurementPoint,
} from '../feature-measurement/measurement';
import { TestBed } from '@angular/core/testing';
import { ObjectViewerComponent } from './object-viewer';
import { Group } from 'three';
import { describe, it, expect, vi } from 'vitest';
function pointer(id: number, x = 10, y = 10, button = 0): PointerEvent {
  return { pointerId: id, clientX: x, clientY: y, button } as PointerEvent;
}
describe('shared viewer interaction scope', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [ObjectViewerComponent] });
    const fixture = TestBed.createComponent(ObjectViewerComponent);
    fixture.componentRef.setInput('object', new Group());
    fixture.componentRef.setInput('extent', 10);
    fixture.componentRef.setInput('ariaLabel', 'Regression viewer');
    const viewer = fixture.componentInstance;
    viewer.measuring.set(true);
    const selected = vi
      .spyOn(
        viewer as unknown as {
          selectMeasurementPoint: (event: PointerEvent) => void;
        },
        'selectMeasurementPoint',
      )
      .mockImplementation(() => undefined);
    return { viewer, selected, fixture };
  }
  it('preserves existing distance behavior without enabling advanced controls on other consumers', () => {
    const { viewer, selected } = setup();
    expect(viewer.featureMeasurements()).toBe(false);
    viewer.onViewportPointerDown(pointer(1));
    viewer.onViewportPointerUp(pointer(1));
    expect(selected).toHaveBeenCalledTimes(1);
  });
  it('does not commit after orbit, a drag returning to its start, a pinch or pointer cancellation', () => {
    const { viewer, selected } = setup();
    viewer.onViewportPointerDown(pointer(1));
    viewer.onViewportPointerMove(pointer(1, 100));
    viewer.onViewportPointerUp(pointer(1));
    viewer.onViewportPointerDown(pointer(1));
    viewer.onViewportPointerDown(pointer(2));
    viewer.onViewportPointerUp(pointer(1));
    viewer.onViewportPointerUp(pointer(2));
    viewer.onViewportPointerDown(pointer(1));
    viewer.onViewportPointerCancel(pointer(1));
    viewer.onViewportPointerUp(pointer(1));
    expect(selected).not.toHaveBeenCalled();
  });
  it('invalidates offered vertices when clipping or placed visibility changes', () => {
    const { viewer } = setup();
    const candidate: MeasurementPoint = {
      coordinates: [1, 2, 3],
      basis: SelectionBasis.Vertex,
      placedItemId: 'build-1',
    };
    const candidates = signal<readonly MeasurementPoint[]>([candidate]);
    vi.spyOn(viewer, 'measurementPanel').mockReturnValue({
      candidates,
    } as unknown as MeasurementPanel);
    const contextUpdates = viewer as unknown as {
      updateCrossSection(): void;
      updatePlacedItems(): void;
    };
    contextUpdates.updateCrossSection();
    expect(candidates()).toEqual([]);
    candidates.set([candidate]);
    contextUpdates.updatePlacedItems();
    expect(candidates()).toEqual([]);
  });
});
