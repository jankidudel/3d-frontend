import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { FormatToolsGrid } from '../../core/components/format-tools-grid/format-tools-grid';
import { HOME_TOOL_GROUPS } from '../home/home-tools';

@Component({
  selector: 'app-three-mf-tools-page',
  imports: [FormatToolsGrid, RouterLink],
  templateUrl: './threemf-tools-page.html',
  styleUrl: '../shared/model-tools-page.scss',
})
export class ThreeMfToolsPage {
  readonly routeUrl = PublicRouteUrl;
  readonly guideRouteUrl = GuideRouteUrl;
  readonly tools =
    HOME_TOOL_GROUPS.find((group) => group.id === '3mf-tools')?.tools ?? [];
  private readonly seo = inject(SeoService);
  constructor() {
    this.seo.apply({
      title: '3MF Tools: Inspect Builds, Measure and Convert | InspectMesh',
      description:
        'Choose a 3MF tool for viewing, mesh checks, build dimensions, volume or conversion. Understand declared units, placed items and processing limits.',
      path: PublicRouteUrl.ThreeMfTools,
    });
  }
}
