import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';

@Component({
  selector: 'app-guides-page',
  imports: [RouterLink],
  templateUrl: './guides-page.html',
  styleUrl: './guides-page.scss',
})
export class GuidesPage {
  protected readonly routeUrl = PublicRouteUrl;
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: '3D Printing File Guides | InspectMesh',
      description:
        'Practical guides for checking, repairing and preparing STL files for 3D printing.',
      path: PublicRouteUrl.Guides,
    });
  }
}
