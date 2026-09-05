import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { HOME_TOOL_GROUPS } from '../home/home-tools';

@Component({
  selector: 'app-tools-page',
  imports: [RouterLink],
  templateUrl: './tools-page.html',
  styleUrl: './tools-page.scss',
})
export class ToolsPage {
  readonly toolGroups = HOME_TOOL_GROUPS.filter(
    (group) => group.id !== 'planning-tools',
  );
  readonly printCostCalculator = {
    cta: 'Calculate print cost',
    description:
      'Estimate material, energy and total print cost from slicer values, or start with an STL or 3MF model.',
    route: PublicRouteUrl.PrintCostCalculator,
    title: '3D Print Cost Calculator',
  };
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: '3D File Tools for Inspection and Printing | InspectMesh',
      description:
        'Free online 3D file tools to inspect mesh quality, check print readiness, measure dimensions, calculate volume and prepare models for 3D printing.',
      path: PublicRouteUrl.AllTools,
    });
  }
}
