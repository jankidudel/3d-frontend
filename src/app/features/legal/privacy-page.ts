import { PublicRouteUrl } from '../../core/seo/public-routes';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_CONFIG } from '../../core/site/site-config';

@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink],
  styleUrl: './legal-page.scss',
  templateUrl: './privacy-page.html',
})
export class PrivacyPage {
  readonly routeUrl = PublicRouteUrl;
  protected readonly privacyContactEmail =
    inject(SITE_CONFIG).privacyContactEmail;
  private readonly seo = inject(SeoService);

  constructor() {
    // Legal utility: reachable from every page, deliberately kept out of search.
    this.seo.applyNoIndex(
      'Privacy | InspectMesh',
      'How InspectMesh handles uploaded 3D files and optional analytics cookies.',
    );
  }
}
