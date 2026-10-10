import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PublicRoutePathValue } from '../../seo/public-routes';
import { NewsletterSignupComponent } from '../newsletter-signup/newsletter-signup';

@Component({
  selector: 'app-site-footer',
  imports: [NewsletterSignupComponent, RouterLink, RouterLinkActive],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooterComponent {
  readonly routePath = PublicRoutePathValue;
}
