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
  styleUrl: '../stl-tools/stl-tools-page.scss',
})
export class ThreeMfToolsPage {
  readonly routeUrl = PublicRouteUrl;
  readonly tools =
    HOME_TOOL_GROUPS.find((group) => group.id === '3mf-tools')?.tools ?? [];
  private readonly seo = inject(SeoService);
  constructor() {
    this.seo.apply({
      title: 'Free 3MF Tools for 3D Printing | InspectMesh',
      description:
        'Free online 3MF tools for checking mesh quality, declared units and print-model geometry before slicing or 3D printing.',
      path: PublicRouteUrl.ThreeMfTools,
    });
  }
}
