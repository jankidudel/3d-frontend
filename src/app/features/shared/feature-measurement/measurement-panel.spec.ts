import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { MeasurementPanel } from './measurement-panel';
import {
  MeasurementFormat,
  MeasurementPolicy,
  MeasurementType,
  SelectionBasis,
} from './measurement';
describe('private measurement panel lifecycle', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [MeasurementPanel],
    }).compileComponents();
    const fixture = TestBed.createComponent(MeasurementPanel);
    fixture.componentRef.setInput('context', {
      format: MeasurementFormat.Stl,
      offset: [10, 20, 30],
      declaredUnit: 'not declared',
    });
    fixture.componentRef.setInput('assumption', 'mm');
    fixture.detectChanges();
    return fixture;
  }
  it('saves, reviews, safely renders names, enforces bounds and confirms clearing', async () => {
    const fixture = await setup(),
      panel = fixture.componentInstance;
    panel.enter('0', '0', '0');
    panel.enter('1', '0', '0');
    panel.name.set('<img src=x onerror=alert(1)> ♥');
    panel.save();
    fixture.detectChanges();
    expect(panel.entries()[0].points[0].basis).toBe(SelectionBasis.Entered);
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    for (let i = 1; i <= MeasurementPolicy.maxRecords; i++) {
      panel.save();
    }
    expect(panel.entries()).toHaveLength(20);
    expect(panel.notice()).toContain('limit');
    panel.setType(MeasurementType.Angle);
    expect(panel.points()).toEqual([]);
    expect(panel.entries()).toHaveLength(20);
    panel.review(panel.entries()[0]);
    expect(panel.points()).toHaveLength(2);
    panel.rename(panel.entries()[0].id, 'Łódź');
    expect(panel.entries()[0].name).toBe('Łódź');
    panel.remove(panel.entries()[0].id);
    expect(panel.entries()).toHaveLength(19);
    panel.confirmClear.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Confirm discard');
    panel.clearAll();
    expect(panel.entries()).toEqual([]);
  });
  it('recomputes saved unit basis, retains unavailable inputs and resets only on successful file replacement', async () => {
    const fixture = await setup(),
      panel = fixture.componentInstance;
    panel.enter('0', '0', '0');
    panel.enter('1', '0', '0');
    panel.save();
    fixture.componentRef.setInput('assumption', 'in');
    fixture.detectChanges();
    expect(panel.entries()[0].coordinateToMm).toBe(25.4);
    expect(panel.notice()).toContain('recomputed');
    panel.setType(MeasurementType.Circle);
    panel.enter('0', '0', '0');
    panel.enter('1', '0', '0');
    panel.enter('2', '0', '0');
    expect(panel.current()?.result.reason).toContain('collinear');
    panel.save();
    expect(panel.entries()).toHaveLength(2);
    panel.undo();
    expect(panel.points()).toHaveLength(2);
    panel.resetForFile();
    expect(panel.entries()).toEqual([]);
    expect(panel.points()).toEqual([]);
  });
});
