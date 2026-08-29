import { Component, inject } from '@angular/core';
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
  constructor() {
    super();
    this.watertightSeo.apply({
      title: 'STL Watertight Checker - Check for Holes and Open Edges',
      description:
        'Check whether an STL file is watertight for 3D printing. Find open edges, holes, non-manifold geometry and separate shells online.',
      path: PublicRouteUrl.WatertightChecker,
    });
  }
}
