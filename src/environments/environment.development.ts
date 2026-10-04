import siteConfig from './site-config.development.json';
import { SiteConfig } from './site-config';

export const environment: SiteConfig & {
  readonly googleAnalyticsMeasurementId: string;
  readonly devWorkflowPreview: boolean;
  readonly indexingEnabled: boolean;
  readonly siteUrl: string;
} = {
  devWorkflowPreview: true,
  googleAnalyticsMeasurementId: 'G-S68WQPCH97',
  ...siteConfig,
};
