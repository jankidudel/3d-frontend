import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { HOME_TOOL_GROUPS } from '../home/home-tools';

@Component({
  selector: 'app-stl-tools-page',
  imports: [RouterLink],
  templateUrl: './stl-tools-page.html',
  styleUrl: './stl-tools-page.scss',
})
export class StlToolsPage {
  readonly tools = HOME_TOOL_GROUPS[0].tools;
  readonly routeUrl = PublicRouteUrl;
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
