import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface SeoConfig {
  readonly siteUrl: string;
  readonly indexingEnabled: boolean;
}

export const SEO_CONFIG = new InjectionToken<SeoConfig>('SEO_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    siteUrl: environment.siteUrl,
    indexingEnabled: environment.indexingEnabled,
  }),
});
