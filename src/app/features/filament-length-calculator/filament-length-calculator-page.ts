import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import {
  FILAMENT_DIAMETERS,
  FILAMENT_PRESETS,
  FilamentPreset,
  gramsToMetres,
  metresToGrams,
} from './filament-length-calculator';

const CONVERSION_MODE = {
  WeightToLength: 'weight-to-length',
  LengthToWeight: 'length-to-weight',
} as const;

type ConversionMode = (typeof CONVERSION_MODE)[keyof typeof CONVERSION_MODE];

@Component({
  selector: 'app-filament-length-calculator-page',
  imports: [RouterLink],
  templateUrl: './filament-length-calculator-page.html',
  styleUrl: './filament-length-calculator-page.scss',
})
export class FilamentLengthCalculatorPage {
  readonly routeUrl = PublicRouteUrl;
  readonly conversionMode = CONVERSION_MODE;
  readonly diameterOptions = FILAMENT_DIAMETERS;
  readonly materialOptions = Object.entries(FILAMENT_PRESETS) as readonly [
    FilamentPreset,
    (typeof FILAMENT_PRESETS)[FilamentPreset],
  ][];
  readonly mode = signal<ConversionMode>(CONVERSION_MODE.WeightToLength);
  readonly weightGrams = signal(1000);
  readonly lengthMetres = signal(100);
  readonly diameterMillimetres = signal<number>(1.75);
  readonly material = signal<FilamentPreset>('Pla');
  readonly customDensity = signal(1.24);
  readonly density = computed(() =>
    this.material() === 'Custom'
      ? this.customDensity()
      : FILAMENT_PRESETS[this.material()].density,
  );
  readonly result = computed(() =>
    this.mode() === CONVERSION_MODE.WeightToLength
      ? gramsToMetres(
          this.weightGrams(),
          this.diameterMillimetres(),
          this.density(),
        )
      : metresToGrams(
          this.lengthMetres(),
          this.diameterMillimetres(),
          this.density(),
        ),
  );

  constructor() {
    inject(SeoService).apply({
      title:
        'Filament Length Calculator: Convert Grams to Metres | InspectMesh',
      description:
        'Convert 3D printer filament grams to metres or metres to grams using filament diameter and material density. Runs locally in your browser.',
      path: PublicRouteUrl.FilamentLengthCalculator,
    });
  }

  setMode(mode: ConversionMode): void {
    this.mode.set(mode);
  }

  setNumber(
    target: 'weightGrams' | 'lengthMetres' | 'customDensity',
    event: Event,
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    this[target].set(value);
  }

  setDiameter(event: Event): void {
    this.diameterMillimetres.set(
      Number((event.target as HTMLSelectElement).value),
    );
  }

  setMaterial(event: Event): void {
    this.material.set(
      (event.target as HTMLSelectElement).value as FilamentPreset,
    );
  }

  reset(): void {
    this.mode.set(CONVERSION_MODE.WeightToLength);
    this.weightGrams.set(1000);
    this.lengthMetres.set(100);
    this.diameterMillimetres.set(1.75);
    this.material.set('Pla');
    this.customDensity.set(1.24);
  }

  format(value: number | null, unit: string): string {
    return value === null || !Number.isFinite(value)
      ? 'Enter positive values to calculate.'
      : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
  }
}
