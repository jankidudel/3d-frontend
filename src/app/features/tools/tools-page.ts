import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewsletterSignupComponent } from '../../core/components/newsletter-signup/newsletter-signup';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { HOME_TOOL_GROUPS } from '../home/home-tools';

@Component({
  selector: 'app-tools-page',
  imports: [NewsletterSignupComponent, RouterLink],
  templateUrl: './tools-page.html',
  styleUrl: './tools-page.scss',
})
export class ToolsPage {
  readonly toolGroups = HOME_TOOL_GROUPS;
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
