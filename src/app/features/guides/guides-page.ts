import { Component, inject } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { NewsletterSignupComponent } from '../../core/components/newsletter-signup/newsletter-signup';
import { guideIndexGroups } from './guides.generated';

@Component({
  selector: 'app-guides-page',
  imports: [NewsletterSignupComponent],
  templateUrl: './guides-page.html',
  styleUrl: './guides-page.scss',
})
export class GuidesPage {
  protected readonly guideGroups = guideIndexGroups;
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
