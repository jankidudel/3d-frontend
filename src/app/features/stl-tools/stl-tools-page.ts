import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { HOME_TOOL_GROUPS } from '../home/home-tools';
import { FormatToolsGrid } from '../../core/components/format-tools-grid/format-tools-grid';

@Component({
  selector: 'app-stl-tools-page',
  imports: [FormatToolsGrid, RouterLink],
  templateUrl: './stl-tools-page.html',
  styleUrl: '../shared/model-tools-page.scss',
})
export class StlToolsPage {
  readonly tools = HOME_TOOL_GROUPS[0].tools;
  readonly routeUrl = PublicRouteUrl;
  readonly guideRouteUrl = GuideRouteUrl;
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: 'Free STL Tools for 3D Printing | InspectMesh',
      description:
        'Free online STL tools to check mesh quality, verify watertight and manifold geometry, measure dimensions, count triangles and calculate volume for 3D printing.',
      path: PublicRouteUrl.Tools,
    });
  }
}
