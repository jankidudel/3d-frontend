import { ExampleAsset } from '../examples/example-assets';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { ThreeMfFilePicker } from './threemf-file-picker';
import { ThreeMfQualityPage } from './threemf-quality-page';

@Component({
  selector: 'app-three-mf-triangle-page',
  imports: [RouterLink, ThreeMfFilePicker, JobProgress],
  templateUrl: './threemf-triangle-page.html',
  styleUrl: '../shared/model-checker-page.scss',
})
export class ThreeMfTrianglePage extends ThreeMfQualityPage {
  readonly exampleAsset = ExampleAsset;
  private readonly triangleSeo = inject(SeoService);
  readonly triangleCount = computed(() => {
    const count = this.report()?.['triangleCount'];
    return typeof count === 'number' &&
      Number.isSafeInteger(count) &&
      count >= 0
      ? count
      : null;
  });
  readonly complexity = computed(() => {
    const count = this.triangleCount();
    if (count === null) {
      return 'Not available';
    }
    return count < 50_000 ? 'Low' : count < 500_000 ? 'Moderate' : 'High';
  });
  constructor() {
    super();
    this.triangleSeo.apply({
      title: '3MF Triangle Counter: Resolved Build Count | InspectMesh',
      description:
        'Count triangles in a supported 3MF build and understand how repeated placed items affect the result. A count is not a print-quality score.',
      path: PublicRouteUrl.ThreeMfTriangleCounter,
    });
  }
}
