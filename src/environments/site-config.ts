export interface SiteConfig {
  readonly contactEmail?: string;
  readonly contactEmailParts?: {
    readonly localPart: string;
    readonly domain: string;
  };
  readonly contactCaptchaSiteKey?: string;
  readonly privacyContactEmail?: string;
}
