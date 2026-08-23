import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SiteConfig } from '../../../environments/site-config';

export const SITE_CONFIG = new InjectionToken<SiteConfig>('SITE_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    privacyContactEmail: environment.privacyContactEmail,
  }),
});
