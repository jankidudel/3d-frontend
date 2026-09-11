import {
  GcodeParseError,
  buildVolumeMessage,
  dimensions,
  parseGcode,
} from './gcode-parser';
import { commonGcodeFixture } from './fixtures/common-gcode.fixture';

describe('parseGcode', () => {
  it('tracks modes, resets, extrusion and metadata', () => {
    const report = parseGcode(commonGcodeFixture);
    expect(report.metadata.slicer).toBe('Cura_SteamEngine 5.8');
    expect(report.metadata.declaredLayers).toBe(2);
    expect(report.metadata.hasThumbnail).toBe(true);
    expect(report.extrusionMoves).toBe(3);
    expect(report.travelMoves).toBe(1);
    expect(report.extents?.max.x).toBe(11);
    expect(report.hotendTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 210, waiting: false }),
        expect.objectContaining({ value: 215, waiting: true }),
      ]),
    );
    expect(report.bedTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 60, waiting: false }),
        expect.objectContaining({ value: 65, waiting: true }),
      ]),
    );
    expect(report.layers).toHaveLength(2);
  });
  it('applies G92 XYZ resets before subsequent absolute motion', () => {
    const report = parseGcode(
      'G90\nG1 X10 Y10 Z1 E1\nG92 X0 Y0 Z0\nG1 X2 Y3 Z4 E2',
    );
    expect(report.extents?.max).toEqual({ x: 10, y: 10, z: 4 });
  });
  it('converts inch coordinates and keeps travel separate', () => {
    const report = parseGcode('G20\nG90\nM82\nG0X1Y1\nG1X2E1');
    expect(report.extents?.max.x).toBeCloseTo(50.8);
    expect(report.travelMoves).toBe(1);
    expect(dimensions(report.extents!).x).toBeCloseTo(50.8);
  });
  it('reports malformed lines and limitations', () => {
    expect(() => parseGcode('G1 Xbroken')).toThrow(GcodeParseError);
    const report = parseGcode('G1 X1\nG2 X2\nM900 K0.05');
    expect(report.limitations.join(' ')).toContain('Arc moves');
    expect(report.limitations.join(' ')).toContain('M900');
  });
  it('compares parsed extents without claiming compatibility', () => {
    const report = parseGcode('G1 X20 Y20 Z20 E1');
    expect(buildVolumeMessage(report, { x: 10, y: 30, z: 30 })).toBe(
      'The parsed motion extents exceed the entered dimensions.',
    );
  });
});
