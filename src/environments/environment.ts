import siteConfig from './site-config.production.json';
import { SiteConfig } from './site-config';

export const environment: SiteConfig & {
  readonly googleAnalyticsMeasurementId: string;
  readonly indexingEnabled: boolean;
  readonly siteUrl: string;
} = {
  googleAnalyticsMeasurementId: 'G-801ECYXPH4',
  ...siteConfig,
};
