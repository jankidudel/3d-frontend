import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import {
  BedShape,
  isPrinterProfile,
  PrinterProfileService,
  PRINTER_PROFILE_STORAGE_KEY,
  CONFIRMED_PRINTER_PROFILE_STORAGE_KEY,
  PRINTER_PROFILE_VERSION,
  PrinterProfile,
} from './printer-profile.service';
const profile: PrinterProfile = {
  schemaVersion: PRINTER_PROFILE_VERSION,
  shape: BedShape.Rectangular,
  x: 220,
  y: 180,
  z: 250,
  unit: 'mm' as const,
};
describe('PrinterProfileService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });
  it('requires explicit axes, version, shape and positive finite dimensions', () => {
    expect(isPrinterProfile(profile)).toBe(true);
    for (const invalid of [
      { ...profile, x: 0 },
      { ...profile, y: -1 },
      { ...profile, z: Infinity },
      { ...profile, x: NaN },
      { ...profile, unit: 'yards' },
      { ...profile, shape: 'unknown' },
      { ...profile, schemaVersion: 99 },
      { width: 220, height: 250, depth: 180, unit: 'mm' },
    ]) {
      expect(isPrinterProfile(invalid)).toBe(false);
    }
  });
  it('preserves raw legacy values without guessing their axes, then saves a separate confirmed basis', () => {
    const raw = '{"width":220,"height":250,"depth":180,"unit":"mm"}';
    localStorage.setItem(PRINTER_PROFILE_STORAGE_KEY, raw);
    const service = TestBed.inject(PrinterProfileService);
    expect(service.profile()).toBeNull();
    expect(service.needsReview()).toBe(true);
    service.save(profile);
    expect(service.profile()).toEqual(profile);
    expect(service.needsReview()).toBe(false);
    expect(localStorage.getItem(PRINTER_PROFILE_STORAGE_KEY)).toBe(raw);
    expect(
      JSON.parse(localStorage.getItem(CONFIRMED_PRINTER_PROFILE_STORAGE_KEY)!),
    ).toEqual(profile);
    service.clear();
    expect(service.profile()).toBeNull();
    expect(localStorage.length).toBe(0);
  });
  it('keeps corrupt or unknown-version confirmed storage unavailable', () => {
    localStorage.setItem(
      CONFIRMED_PRINTER_PROFILE_STORAGE_KEY,
      '{"schemaVersion":99}',
    );
    const service = TestBed.inject(PrinterProfileService);
    expect(service.profile()).toBeNull();
    expect(service.needsReview()).toBe(true);
  });
  it('continues in memory when storage writes fail', () => {
    const service = TestBed.inject(PrinterProfileService);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    service.save(profile);
    expect(service.profile()).toEqual(profile);
    service.clear();
    expect(service.profile()).toBeNull();
  });
  it('does not access browser storage during SSR', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const read = vi.spyOn(Storage.prototype, 'getItem');
    expect(TestBed.inject(PrinterProfileService).profile()).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });
});
