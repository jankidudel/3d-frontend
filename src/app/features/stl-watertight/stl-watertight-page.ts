import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { StlManifoldPage } from '../stl-manifold/stl-manifold-page';
import { StlFilePicker } from '../stl-quality/stl-file-picker/stl-file-picker';

@Component({
  selector: 'app-stl-watertight-page',
  imports: [RouterLink, StlFilePicker, JobProgress],
  templateUrl: './stl-watertight-page.html',
  styleUrl: '../shared/model-checker-page.scss',
})
export class StlWatertightPage extends StlManifoldPage {
  private readonly watertightSeo = inject(SeoService);
  readonly boundaryCount = computed(() => {
    const value = this.topology()?.['openEdgeCount'];
    return typeof value === 'number' && Number.isInteger(value) && value >= 0
      ? value
      : null;
  });
  constructor() {
    super();
    this.watertightSeo.apply({
      title: 'STL Watertight Checker: Boundaries and Closure | InspectMesh',
      description:
        'Check STL exposed boundaries and interpret a zero-open-edge result alongside other mesh findings. Inspect an opening before deciding to close it.',
      path: PublicRouteUrl.WatertightChecker,
    });
  }
}
