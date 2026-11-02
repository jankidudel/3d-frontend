import { describe, expect, it } from 'vitest';
import {
  assessEnvelope,
  assessProfileOrientations,
  EnvelopeState,
  rectangleInDisc,
} from './build-space';
import {
  BedShape,
  PrinterProfile,
  PRINTER_PROFILE_VERSION,
} from './printer-profile.service';
const circle: PrinterProfile = {
  schemaVersion: PRINTER_PROFILE_VERSION,
  shape: BedShape.Circular,
  x: 220,
  y: 220,
  z: 250,
  diameter: 220,
  unit: 'mm',
};
const box: PrinterProfile = {
  ...circle,
  shape: BedShape.Rectangular,
  x: 220,
  y: 180,
  diameter: undefined,
};
const model = (w: number, h: number, z = 240) => ({
  width: w,
  height: h,
  depth: z,
});
describe('shared build-space geometry', () => {
  it('keeps asymmetric X/Y independent of Z and rotation mode', () => {
    expect(assessEnvelope(model(200, 170), 'mm', box).state).toBe(
      EnvelopeState.Contained,
    );
    expect(assessEnvelope(model(200, 190), 'mm', box).state).toBe(
      EnvelopeState.Outside,
    );
    expect(
      assessProfileOrientations(model(200, 190), 'mm', box)?.current.fit.fits,
    ).toBe(false);
    expect(assessEnvelope(model(200, 170, 251), 'mm', box).state).toBe(
      EnvelopeState.Outside,
    );
  });
  it('checks the full centred diagonal and radial slack', () => {
    const contained = assessEnvelope(model(150, 150), 'mm', circle);
    expect(contained.state).toBe(EnvelopeState.Contained);
    expect(contained.radiusSlackMm).toBeCloseTo(3.9339828);
    expect(assessEnvelope(model(150, 150), 'mm', circle, 5).state).toBe(
      EnvelopeState.Outside,
    );
    expect(assessEnvelope(model(160, 160), 'mm', circle).state).toBe(
      EnvelopeState.Outside,
    );
    expect(assessEnvelope(model(180, 20), 'mm', circle).state).toBe(
      EnvelopeState.Contained,
    );
    expect(assessEnvelope(model(20, 180), 'mm', circle).radiusSlackMm).toBe(
      assessEnvelope(model(180, 20), 'mm', circle).radiusSlackMm,
    );
  });
  it('tests actual off-centre corners and cannot rely on spans alone', () => {
    expect(rectangleInDisc(40, -30, 60, 60, 0, 0, 110)).toBe(true);
    expect(rectangleInDisc(50, -30, 60, 60, 0, 0, 110)).toBe(false);
    expect(Math.hypot(100, 30)).toBeCloseTo(104.403065);
    expect(Math.hypot(110, 30)).toBeCloseTo(114.0175425);
  });
  it('uses inclusive stored-number tangency without an added tolerance', () => {
    const p = { ...circle, x: 10, y: 10, diameter: 10 };
    expect(assessEnvelope(model(6, 8, 1), 'mm', p).state).toBe(
      EnvelopeState.Contained,
    );
    expect(assessEnvelope(model(6, 8 - 1e-9, 1), 'mm', p).state).toBe(
      EnvelopeState.Contained,
    );
    expect(assessEnvelope(model(6, 8 + 1e-9, 1), 'mm', p).state).toBe(
      EnvelopeState.Outside,
    );
  });
  it('does not subtract radial edge exclusion from Z', () => {
    const result = assessEnvelope(model(100, 100, 250), 'mm', circle, 5);
    expect(result.state).toBe(EnvelopeState.Contained);
    expect(result.zSlackMm).toBe(0);
  });
  it('rejects invalid input and exhausted regions', () => {
    for (const bad of [0, -1, NaN, Infinity]) {
      expect(assessEnvelope(model(bad, 10), 'mm', circle).state).toBe(
        EnvelopeState.Unavailable,
      );
    }
    expect(assessEnvelope(model(10, 10), 'mm', circle, 110).state).toBe(
      EnvelopeState.Unavailable,
    );
    expect(assessEnvelope(model(10, 10), 'mm', null).state).toBe(
      EnvelopeState.Unavailable,
    );
  });
  it('solves scale with a fixed physical expansion and independently verifies the inequality', () => {
    const s =
      assessEnvelope(model(180, 100, 100), 'mm', circle, 5, 4)
        .maximumScalePercentage! / 100;
    const corner = Math.hypot((s * 180) / 2 + 4, (s * 100) / 2 + 4);
    expect(corner).toBeCloseTo(105, 10);
    expect(corner).toBeLessThanOrEqual(105);
    expect(
      Math.hypot(((s + 1e-6) * 180) / 2 + 4, ((s + 1e-6) * 100) / 2 + 4),
    ).toBeGreaterThan(105);
    expect(
      assessEnvelope(model(180, 100, 100), 'mm', circle, 0, 100)
        .maximumScalePercentage,
    ).toBe(0);
  });
  it('shows conservative rejection of an analytical cross with occupied points inside', () => {
    const points = [
      [90, 10],
      [90, -10],
      [-90, 10],
      [-90, -10],
      [10, 90],
      [-10, 90],
      [10, -90],
      [-10, -90],
    ];
    expect(points.every(([x, y]) => x * x + y * y < 110 * 110)).toBe(true);
    expect(assessEnvelope(model(180, 180), 'mm', circle).state).toBe(
      EnvelopeState.Outside,
    );
  });
  it('converts centimetres and inches before assessing', () => {
    expect(
      assessEnvelope(model(200, 170), 'mm', {
        ...box,
        x: 22,
        y: 18,
        z: 25,
        unit: 'cm',
      }).state,
    ).toBe(EnvelopeState.Contained);
    expect(
      assessEnvelope(model(200, 170), 'mm', {
        ...box,
        x: 220 / 25.4,
        y: 180 / 25.4,
        z: 250 / 25.4,
        unit: 'in',
      }).state,
    ).toBe(EnvelopeState.Contained);
  });
});
