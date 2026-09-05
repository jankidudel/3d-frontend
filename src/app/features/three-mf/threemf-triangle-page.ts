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
  private readonly triangleSeo = inject(SeoService);
  readonly complexity = computed(() => {
    const count = this.report()?.['triangleCount'];
    if (typeof count !== 'number') {
      return 'Not available';
    }
    return count < 50_000 ? 'Low' : count < 500_000 ? 'Moderate' : 'High';
  });
  constructor() {
    super();
    this.triangleSeo.apply({
      title: '3MF Triangle Counter - Count 3MF Triangles Online | InspectMesh',
      description:
        'Count triangles in a 3MF print build online. Inspect resolved build geometry and understand mesh complexity before slicing.',
      path: PublicRouteUrl.ThreeMfTriangleCounter,
    });
  }
}
