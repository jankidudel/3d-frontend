import siteConfig from './site-config.production.json';
import { SiteConfig } from './site-config';

export const environment: SiteConfig & {
  readonly googleAnalyticsMeasurementId: string;
  readonly devWorkflowPreview: boolean;
  readonly indexingEnabled: boolean;
  readonly siteUrl: string;
} = {
  devWorkflowPreview: false,
  googleAnalyticsMeasurementId: 'G-801ECYXPH4',
  ...siteConfig,
};
