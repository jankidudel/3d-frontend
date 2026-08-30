import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.scss',
})
export class NotFoundPage {
  protected readonly routeUrl = PublicRouteUrl;
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.applyNoIndex(
      'Page Not Found | InspectMesh',
      'The page you requested could not be found.',
    );
  }
}
