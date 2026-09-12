import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { HOME_TOOL_GROUPS } from './home-tools';
import { HomeNewsletterPromptComponent } from './home-newsletter-prompt';

@Component({
  selector: 'app-home-page',
  imports: [HomeNewsletterPromptComponent, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  protected readonly toolGroups = HOME_TOOL_GROUPS;
  protected readonly routeUrl = PublicRouteUrl;
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: '3D Quality Tools - STL Checks, Dimensions and Scaling',
      description:
        'Free STL tools to check mesh quality, measure dimensions, convert units, calculate scaling and assess printer build-volume fit.',
      path: '/',
    });
  }
}
