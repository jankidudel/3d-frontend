import { TestBed } from '@angular/core/testing';
import {
  isPrinterProfile,
  PrinterProfileService,
  PRINTER_PROFILE_STORAGE_KEY,
} from './printer-profile.service';

describe('PrinterProfileService', () => {
  beforeEach(() => {
    localStorage.removeItem(PRINTER_PROFILE_STORAGE_KEY);
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.removeItem(PRINTER_PROFILE_STORAGE_KEY));

  it('accepts only usable dimensions and a supported unit', () => {
    expect(
      isPrinterProfile({ width: 220, height: 250, depth: 220, unit: 'mm' }),
    ).toBe(true);
    expect(
      isPrinterProfile({ width: 0, height: 250, depth: 220, unit: 'mm' }),
    ).toBe(false);
    expect(
      isPrinterProfile({ width: 220, height: 250, depth: 220, unit: 'yards' }),
    ).toBe(false);
  });

  it('saves and removes a profile locally', () => {
    const service = TestBed.inject(PrinterProfileService);
    service.save({ width: 220, height: 250, depth: 220, unit: 'mm' });

    expect(service.profile()).toEqual({
      width: 220,
      height: 250,
      depth: 220,
      unit: 'mm',
    });
    expect(
      JSON.parse(localStorage.getItem(PRINTER_PROFILE_STORAGE_KEY) ?? ''),
    ).toEqual(service.profile());

    service.clear();
    expect(service.profile()).toBeNull();
    expect(localStorage.getItem(PRINTER_PROFILE_STORAGE_KEY)).toBeNull();
  });

  it('ignores corrupt saved data', () => {
    localStorage.setItem(PRINTER_PROFILE_STORAGE_KEY, '{not valid json');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    expect(TestBed.inject(PrinterProfileService).profile()).toBeNull();
  });
});
