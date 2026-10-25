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
      title: 'STL Tools: View, Check, Measure and Repair | InspectMesh',
      description:
        'Choose an STL viewer, checker, measurement or repair tool by the result you need. See which actions run locally and which upload your file.',
      path: PublicRouteUrl.Tools,
    });
  }
}
