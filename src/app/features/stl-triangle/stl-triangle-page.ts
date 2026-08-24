import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StlJobProgress } from '../../core/components/stl-job-progress/stl-job-progress';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { StlManifoldPage } from '../stl-manifold/stl-manifold-page';
import { StlFilePicker } from '../stl-quality/stl-file-picker/stl-file-picker';

@Component({
  selector: 'app-stl-triangle-page',
  imports: [RouterLink, StlFilePicker, StlJobProgress],
  templateUrl: './stl-triangle-page.html',
  styleUrl: '../stl-manifold/stl-manifold-page.scss',
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
