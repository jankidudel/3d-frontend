import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { materials, materialSources } from '../materials/material-catalogue';
import { MaterialProperty } from '../materials/material-evidence';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import {
  DensityOrigin,
  editDensity,
  initialDensityState,
  selectDensityPreset,
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
  imports: [ToolEvidenceComponent, RouterLink],
  templateUrl: './filament-length-calculator-page.html',
  styleUrl: './filament-length-calculator-page.scss',
})
export class FilamentLengthCalculatorPage {
  readonly routeUrl = PublicRouteUrl;
  readonly conversionMode = CONVERSION_MODE;
  readonly filamentPreset = FilamentPreset;
  readonly diameterOptions = FILAMENT_DIAMETERS;
  readonly materialOptions = Object.entries(FILAMENT_PRESETS) as readonly [
    FilamentPreset,
    (typeof FILAMENT_PRESETS)[FilamentPreset],
  ][];
  readonly mode = signal<ConversionMode>(CONVERSION_MODE.WeightToLength);
  readonly weightGrams = signal(1000);
  readonly lengthMetres = signal(100);
  readonly diameterMillimetres = signal<number>(1.75);
  readonly densityState = signal(initialDensityState(null, null));
  readonly material = computed(() => this.densityState().preset);
  readonly density = computed(() => this.densityState().value);
  readonly densityOrigin = computed(() => this.densityState().origin);
  readonly densityProduct = computed(() =>
    materials.find((material) => material.id === this.densityState().productId),
  );
  readonly densitySource = computed(() => {
    const sourceId = this.densityProduct()?.productExample?.claims.find(
      (claim) => claim.property === MaterialProperty.Density,
    )?.sourceId;
    return materialSources.find((source) => source.id === sourceId);
  });
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
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        if (this.densityState().origin !== DensityOrigin.User) {
          this.densityState.set(
            initialDensityState(params.get('material'), params.get('grade')),
          );
        }
      });
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
    if (target === 'customDensity') {
      this.densityState.update((state) => editDensity(state, value));
    } else {
      this[target].set(value);
    }
  }

  setDiameter(event: Event): void {
    this.diameterMillimetres.set(
      Number((event.target as HTMLSelectElement).value),
    );
  }

  setMaterial(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.densityState.update((state) => selectDensityPreset(state, id));
  }

  applyPreset(): void {
    this.densityState.set(initialDensityState(this.material(), null));
  }

  reset(): void {
    this.mode.set(CONVERSION_MODE.WeightToLength);
    this.weightGrams.set(1000);
    this.lengthMetres.set(100);
    this.diameterMillimetres.set(1.75);
    this.densityState.set(initialDensityState(null, null));
  }

  format(value: number | null, unit: string): string {
    return value === null || !Number.isFinite(value)
      ? 'Enter positive values to calculate.'
      : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
  }
}
