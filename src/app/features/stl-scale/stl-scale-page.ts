import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { ExampleAsset } from '../examples/example-assets';
import { ExampleLoader } from '../examples/example-loader';
import { Component, computed, inject, signal } from '@angular/core';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { readStl, StlMesh, writeBinaryStl } from '../stl-reducer/stl-reducer';
import {
  dimensionsOf,
  percentageScale,
  scaleDimensions,
  scaleMesh,
  ScaleDimension,
  ScaleUnit,
  targetDimensionScale,
  unitConversionScale,
} from './stl-scale';

type ScaleMethod = 'percentage' | 'target' | 'units';

@Component({
  selector: 'app-stl-scale-page',
  imports: [ExampleLoader],
  templateUrl: './stl-scale-page.html',
  styleUrl: './stl-scale-page.scss',
})
export class StlScalePage {
  readonly guideRouteUrl = GuideRouteUrl;
  readonly exampleAsset = ExampleAsset;
  readonly loadPublicExample = async (
    files: readonly File[],
  ): Promise<void> => {
    await this.selectFile(files[0]);
    this.setPercentage(150);
    if (this.error()) {
      throw new Error(this.error());
    }
  };
  readonly routeUrl = PublicRouteUrl;
  readonly unit = ScaleUnit;
  readonly file = signal<File | null>(null);
  readonly source = signal<StlMesh | null>(null);
  readonly method = signal<ScaleMethod>('percentage');
  readonly percentage = signal(100);
  readonly targetDimension = signal<ScaleDimension>('width');
  readonly targetValue = signal<number | null>(null);
  readonly targetUnit = signal<ScaleUnit>(ScaleUnit.Millimetres);
  readonly sourceUnit = signal<ScaleUnit>(ScaleUnit.Millimetres);
  readonly conversionTargetUnit = signal<ScaleUnit>(ScaleUnit.Millimetres);
  readonly error = signal('');
  readonly sourceDimensions = computed(() => {
    const source = this.source();
    return source ? dimensionsOf(source) : null;
  });
  readonly scaleFactor = computed(() => {
    const dimensions = this.sourceDimensions();
    if (!dimensions) {
      return null;
    }
    if (this.method() === 'percentage') {
      return percentageScale(this.percentage());
    }
    if (this.method() === 'target') {
      const target = this.targetValue();
      return target === null
        ? null
        : targetDimensionScale(
            dimensions,
            this.targetDimension(),
            target,
            this.targetUnit(),
          );
    }
    return unitConversionScale(this.sourceUnit(), this.conversionTargetUnit());
  });
  readonly outputUnit = computed(() =>
    this.method() === 'target'
      ? this.targetUnit()
      : this.method() === 'units'
        ? this.conversionTargetUnit()
        : ScaleUnit.Millimetres,
  );
  readonly scaledDimensions = computed(() => {
    const dimensions = this.sourceDimensions();
    const factor = this.scaleFactor();
    if (!dimensions || factor === null) {
      return null;
    }
    if (this.method() === 'units') {
      return {
        width: dimensions.width * factor,
        depth: dimensions.depth * factor,
        height: dimensions.height * factor,
      };
    }
    return scaleDimensions(dimensions, factor, this.outputUnit());
  });
  readonly scaledMesh = computed(() => {
    const source = this.source();
    const factor = this.scaleFactor();
    return source && factor !== null && this.scaledDimensions()
      ? scaleMesh(source, factor)
      : null;
  });
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  private scaleCompletedTracked = false;

  constructor() {
    this.seo.apply({
      title: 'STL Scale Tool - Resize STL Files Online | InspectMesh',
      description:
        'Resize an STL proportionally by percentage, target dimensions, or an assumed unit conversion. Check the new size and download the scaled STL locally.',
      path: PublicRouteUrl.StlScaleTool,
    });
  }

  async selectFile(file: File | null): Promise<void> {
    this.error.set('');
    this.source.set(null);
    this.file.set(null);
    this.scaleCompletedTracked = false;
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.stl')) {
      this.error.set('Choose an STL file with a .stl extension.');
      return;
    }
    if (file.size === 0) {
      this.error.set('The selected STL file is empty.');
      return;
    }
    if (file.size > getMaxFileUploadSizeLimit()) {
      this.error.set(
        'This file is over the 25 MiB limit. Choose a smaller STL file.',
      );
      return;
    }
    try {
      this.source.set(await readStl(file));
      this.file.set(file);
      this.trackScaleCompletion();
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'We could not read that STL file.',
      );
    }
  }

  onPicker(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.selectFile(input.files?.item(0) ?? null);
  }
  openPicker(input: HTMLInputElement): void {
    input.click();
  }
  setPercentage(value: number): void {
    this.method.set('percentage');
    this.percentage.set(value);
    this.trackScaleCompletion();
  }
  setTargetValue(event: Event): void {
    this.method.set('target');
    const value = Number((event.target as HTMLInputElement).value);
    this.targetValue.set(Number.isFinite(value) ? value : null);
    this.trackScaleCompletion();
  }
  download(): void {
    const mesh = this.scaledMesh();
    const file = this.file();
    if (!mesh || !file) {
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(writeBinaryStl(mesh));
    anchor.download = `${file.name.replace(/\.stl$/i, '')}-scaled.stl`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }
  format(value: number): string {
    return value.toFixed(2);
  }
  formatBytes(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KiB`
      : `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  }
  private trackScaleCompletion(): void {
    if (!this.scaleCompletedTracked && this.scaledMesh()) {
      this.analytics.trackStlScaleCompleted();
      this.scaleCompletedTracked = true;
    }
  }
}
