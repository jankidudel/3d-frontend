import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { HOME_TOOL_GROUPS } from './home-tools';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  readonly guideRouteUrl = GuideRouteUrl;
  protected readonly featuredTools = [
    PublicRouteUrl.Viewer,
    PublicRouteUrl.ThreeMfViewer,
    PublicRouteUrl.StlPrintPreflight,
    PublicRouteUrl.PrinterFitChecker,
    PublicRouteUrl.StlCompare,
    PublicRouteUrl.BatchStlChecker,
    PublicRouteUrl.PrintCostCalculator,
    PublicRouteUrl.PrintPriceCalculator,
  ].map((route) =>
    HOME_TOOL_GROUPS.flatMap((group) => group.tools).find(
      (tool) => tool.route === route,
    )!,
  );
  protected readonly routeUrl = PublicRouteUrl;
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: 'InspectMesh - 3D Printing Tools and Practical Guides',
      description:
        'Inspect and prepare 3D-print models, understand file checks, plan dimensions and print costs, and choose your next step with practical tools and guides.',
      path: PublicRouteUrl.Home,
    });
  }
}
