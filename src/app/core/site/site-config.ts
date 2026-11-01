import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SiteConfig } from '../../../environments/site-config';

export function resolveContactEmail(config: SiteConfig): string | undefined {
  if (config.contactEmail) {
    return config.contactEmail;
  }
  if (config.contactEmailParts) {
    return [
      config.contactEmailParts.localPart,
      config.contactEmailParts.domain,
    ].join('@');
  }
  return undefined;
}

export const SITE_CONFIG = new InjectionToken<SiteConfig>('SITE_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    contactEmail: resolveContactEmail(environment),
    contactCaptchaSiteKey: environment.contactCaptchaSiteKey,
    privacyContactEmail: environment.privacyContactEmail,
  }),
});
