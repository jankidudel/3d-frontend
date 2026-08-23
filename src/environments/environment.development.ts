import siteConfig from './site-config.development.json';
import { SiteConfig } from './site-config';

export const environment: SiteConfig & {
  readonly googleAnalyticsMeasurementId: string;
  readonly indexingEnabled: boolean;
  readonly siteUrl: string;
} = {
  googleAnalyticsMeasurementId: 'G-S68WQPCH97',
  ...siteConfig,
};
