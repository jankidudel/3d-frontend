import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SITE_CONFIG } from '../../core/site/site-config';

type ContactReason =
  | 'Report a problem'
  | 'Request a tool or feature'
  | 'General question'
  | 'Partnership or business enquiry';

const CONTACT_REASONS: readonly ContactReason[] = [
  'Report a problem',
  'Request a tool or feature',
  'General question',
  'Partnership or business enquiry',
];

@Component({
  selector: 'app-contact-page',
  templateUrl: './contact-page.html',
  styleUrl: './contact-page.scss',
})
export class ContactPage {
  protected readonly reasons = CONTACT_REASONS;
  protected readonly reason = signal<ContactReason | ''>('');
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly message = signal('');
  protected readonly context = signal('');
  protected readonly honeypot = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly submitted = signal(false);
  private readonly siteConfig = inject(SITE_CONFIG);
  protected readonly deliveryAvailable = Boolean(
    this.siteConfig.contactEmail ?? this.siteConfig.privacyContactEmail,
  );
  private readonly contactEmail =
    this.siteConfig.contactEmail ?? this.siteConfig.privacyContactEmail;
  private readonly analytics = inject(AnalyticsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private started = false;

  constructor() {
    const route = inject(ActivatedRoute);
    const suppliedContext = route.snapshot.queryParamMap.get('context')?.trim();
    if (suppliedContext) {
      this.context.set(suppliedContext.slice(0, 240));
    }
    inject(SeoService).apply({
      title: 'Contact & feedback | InspectMesh',
      description:
        'Send InspectMesh feedback, report a problem, request a tool, ask a question or discuss working together.',
      path: PublicRouteUrl.Contact,
    });
    this.analytics.trackContactFeedbackOpened();
  }

  protected update(
    field: 'reason' | 'name' | 'email' | 'message' | 'context' | 'honeypot',
    event: Event,
  ): void {
    const value = (
      event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    ).value;
    switch (field) {
      case 'reason':
        this.reason.set(value as ContactReason | '');
        break;
      case 'name':
        this.name.set(value);
        break;
      case 'email':
        this.email.set(value);
        break;
      case 'message':
        this.message.set(value);
        break;
      case 'context':
        this.context.set(value);
        break;
      case 'honeypot':
        this.honeypot.set(value);
        break;
    }
    this.errors.update((errors) => {
      const remaining = { ...errors };
      delete remaining[field];
      return remaining;
    });
    if (!this.started && field !== 'honeypot') {
      this.started = true;
      this.analytics.trackContactFeedbackStarted();
    }
  }

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!this.reason()) {
      errors['reason'] = 'Choose a reason for getting in touch.';
    }
    if (!this.email().trim()) {
      errors['email'] = 'Enter your email address.';
    } else if (!this.isValidEmail(this.email())) {
      errors['email'] = 'Enter a valid email address.';
    }
    if (!this.message().trim()) {
      errors['message'] = 'Enter a message.';
    }
    if (this.honeypot()) {
      return;
    }
    this.errors.set(errors);
    if (Object.keys(errors).length || !this.contactEmail || !this.isBrowser) {
      return;
    }

    const body = [
      `Reason: ${this.reason()}`,
      `Name: ${this.name().trim() || 'Not provided'}`,
      `Email: ${this.email().trim()}`,
      `Page or tool: ${this.context().trim() || 'Not provided'}`,
      '',
      this.message().trim(),
    ].join('\n');
    const href = `mailto:${encodeURIComponent(this.contactEmail)}?subject=${encodeURIComponent(`InspectMesh feedback: ${this.reason()}`)}&body=${encodeURIComponent(body)}`;
    this.analytics.trackContactFeedbackSubmitted();
    this.submitted.set(true);
    window.location.assign(href);
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }
}
