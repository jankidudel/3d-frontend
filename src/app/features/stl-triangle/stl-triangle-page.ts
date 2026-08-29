import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { StlManifoldPage } from '../stl-manifold/stl-manifold-page';
import { StlFilePicker } from '../stl-quality/stl-file-picker/stl-file-picker';

@Component({
  selector: 'app-stl-triangle-page',
  imports: [RouterLink, StlFilePicker, JobProgress],
  templateUrl: './stl-triangle-page.html',
  styleUrl: '../shared/model-checker-page.scss',
})
export class StlTrianglePage extends StlManifoldPage {
  private readonly triangleSeo = inject(SeoService);
  constructor() {
    super();
    this.triangleSeo.apply({
      title: 'STL Triangle Counter - Count Triangles in an STL File',
      description:
        'Count triangles in an STL file online. See triangle count, file size and mesh complexity before slicing or sharing a 3D model.',
      path: PublicRouteUrl.TriangleCounter,
    });
  }
}
