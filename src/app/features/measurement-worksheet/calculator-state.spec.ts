import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import { ToleranceCalculatorPage } from '../tolerance-calculator/tolerance-calculator-page';
import { MatingMode } from '../tolerance-calculator/tolerance-calculator';
import { ShrinkageCalculatorPage } from '../shrinkage-calculator/shrinkage-calculator-page';
import { RepeatReadings } from './repeat-readings';

const reading = (value: number) => ({ value, included: true, reason: '' });

describe('measurement calculator state and privacy', () => {
  const track = vi.fn();
  beforeEach(() => {
    track.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SeoService, useValue: { apply: vi.fn() } },
        {
          provide: AnalyticsService,
          useValue: { trackToleranceCalculator: track },
        },
      ],
    });
  });

  it('keeps applied evidence stable when current readings change, and resets all records', () => {
    const page = TestBed.createComponent(
      ToleranceCalculatorPage,
    ).componentInstance;
    page.matingMode.set(MatingMode.PrintedPair);
    page.desiredClearance.set(0.2);
    page.intendedHole.set(10);
    page.holeReadings.set([reading(9.68), reading(9.72), reading(9.7)]);
    page.intendedOutside.set(10);
    page.outsideReadings.set([reading(10.1)]);
    page.applyCalibration();
    expect(page.result()?.modelledHoleDiameter).toBeCloseTo(10.5);
    expect(page.result()?.modelledPinDiameter).toBeCloseTo(9.9);
    expect(track).toHaveBeenCalledExactlyOnceWith(
      AnalyticsEvent.ToleranceCalibrationApplied,
    );
    page.holeReadings.set([reading(9.8)]);
    expect(page.calibrationErrors().holeError).toBeCloseTo(-0.2);
    expect(page.result()?.modelledHoleDiameter).toBeCloseTo(10.5);
    expect(page.worksheet().appliedEvidence?.hole.readings).toHaveLength(3);
    page.holeReadings.set([
      ...page.holeReadings(),
      { value: null, included: true, reason: '' },
    ]);
    expect(page.calibrationReady()).toBe(false);
    page.applyCalibration();
    expect(page.result()?.modelledHoleDiameter).toBeCloseTo(10.5);

    page.notes.update((notes) => ({
      ...notes,
      label: 'Private project label',
    }));
    page.reset();
    expect(page.holeStats()).toBeNull();
    expect(page.appliedEvidence()).toBeNull();
    expect(page.notes().label).toBe('');
    expect(page.holeError()).toBeNull();
  });

  it('does not fill missing axes and compares recorded spread with the dimensional adjustment', () => {
    const page = TestBed.createComponent(
      ShrinkageCalculatorPage,
    ).componentInstance;
    page.designed.x.set(100);
    page.readings.x.set([reading(99.98), reading(100), reading(100.02)]);
    expect(page.result().x?.scalePercent).toBe(100);
    expect(page.result().y).toBeNull();
    expect(page.result().z).toBeNull();
    expect(page.spreadCaution(page.axes[0])).toBe(true);
    page.readings.x.set([
      ...page.readings.x(),
      { value: null, included: true, reason: '' },
    ]);
    expect(page.result().x).toBeNull();
    page.reset();
    expect(page.statistics().x).toBeNull();
  });

  it('can remove an unfilled added slot but preserves a recorded excluded value', () => {
    const component = TestBed.createComponent(RepeatReadings).componentInstance;
    component.add();
    expect(component.readings()).toHaveLength(2);
    component.removeEmpty(1);
    expect(component.readings()).toHaveLength(1);
    component.readings.set([
      reading(10),
      { value: 10.1, included: false, reason: 'Damaged test' },
    ]);
    component.removeEmpty(1);
    expect(component.readings()).toHaveLength(2);
  });
});
