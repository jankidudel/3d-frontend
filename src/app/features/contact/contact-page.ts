import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { ContactService } from '../../core/api/contact.service';
import { TurnstileService } from '../../core/contact/turnstile.service';
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

const CONTACT_LIMITS = {
  name: 120,
  email: 254,
  context: 240,
  message: 5000,
} as const;
export const CONTACT_SUBMITTED_STORAGE_KEY = 'contact_form_submitted_v1';

@Component({
  selector: 'app-contact-page',
  templateUrl: './contact-page.html',
  styleUrl: './contact-page.scss',
})
export class ContactPage implements AfterViewInit {
  protected readonly reasons = CONTACT_REASONS;
  protected readonly limits = CONTACT_LIMITS;
  protected readonly reason = signal<ContactReason | ''>('');
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly message = signal('');
  protected readonly context = signal('');
  protected readonly honeypot = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal('');
  protected readonly captchaToken = signal('');
  protected readonly captchaError = signal('');
  private readonly siteConfig = inject(SITE_CONFIG);
  protected readonly deliveryAvailable = Boolean(
    (this.siteConfig.contactEmail ?? this.siteConfig.privacyContactEmail) &&
    this.siteConfig.contactCaptchaSiteKey,
  );
  private readonly captchaSiteKey = this.siteConfig.contactCaptchaSiteKey;
  private readonly analytics = inject(AnalyticsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly contactService = inject(ContactService);
  private readonly turnstile = inject(TurnstileService);
  private captchaWidgetId?: string;
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

  ngAfterViewInit(): void {
    if (this.deliveryAvailable && this.captchaSiteKey && this.isBrowser) {
      void this.renderCaptcha();
    }
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
    this.submitError.set('');
    this.submitted.set(false);
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
    } else if (this.email().trim().length > CONTACT_LIMITS.email) {
      errors['email'] =
        `Email address must be ${CONTACT_LIMITS.email} characters or fewer.`;
    }
    if (this.name().trim().length > CONTACT_LIMITS.name) {
      errors['name'] =
        `Name must be ${CONTACT_LIMITS.name} characters or fewer.`;
    }
    if (!this.message().trim()) {
      errors['message'] = 'Enter a message.';
    } else if (this.message().trim().length > CONTACT_LIMITS.message) {
      errors['message'] =
        `Message must be ${CONTACT_LIMITS.message.toLocaleString()} characters or fewer.`;
    }
    if (this.context().trim().length > CONTACT_LIMITS.context) {
      errors['context'] =
        `Page or tool must be ${CONTACT_LIMITS.context} characters or fewer.`;
    }
    if (!this.captchaToken()) {
      errors['captcha'] = 'Complete the CAPTCHA before sending your message.';
    }
    if (this.honeypot()) {
      return;
    }
    this.errors.set(errors);
    if (
      Object.keys(errors).length ||
      !this.deliveryAvailable ||
      this.submitting()
    ) {
      return;
    }
    this.submitting.set(true);
    this.contactService
      .send({
        reason: this.reason(),
        name: this.name().trim(),
        email: this.email().trim(),
        message: this.message().trim(),
        context: this.context().trim(),
        website: this.honeypot(),
        turnstileToken: this.captchaToken(),
      })
      .subscribe({
        next: () => {
          this.analytics.trackContactFeedbackSubmitted();
          this.clearForm();
          this.submitted.set(true);
          this.saveSubmittedFlag();
          this.submitting.set(false);
          this.resetCaptcha();
        },
        error: () => {
          this.submitError.set(
            'We could not send your message. Please try again.',
          );
          this.submitting.set(false);
          this.resetCaptcha();
        },
      });
  }

  private async renderCaptcha(): Promise<void> {
    const element = document.getElementById('contact-turnstile');
    if (!element || !this.captchaSiteKey) {
      return;
    }
    try {
      const turnstile = await this.turnstile.load();
      this.captchaWidgetId = turnstile.render(element, {
        sitekey: this.captchaSiteKey,
        callback: (token) => this.captchaToken.set(token),
        'expired-callback': () => this.captchaToken.set(''),
        'error-callback': () =>
          this.captchaError.set(
            'CAPTCHA could not load. Please refresh and try again.',
          ),
      });
    } catch {
      this.captchaError.set(
        'CAPTCHA could not load. Please refresh and try again.',
      );
    }
  }

  private resetCaptcha(): void {
    this.captchaToken.set('');
    this.captchaError.set('');
    if (this.captchaWidgetId) {
      window.turnstile?.reset(this.captchaWidgetId);
    }
  }

  private clearForm(): void {
    this.reason.set('');
    this.name.set('');
    this.email.set('');
    this.message.set('');
    this.context.set('');
    this.honeypot.set('');
    this.errors.set({});
    this.submitError.set('');
  }

  private saveSubmittedFlag(): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(CONTACT_SUBMITTED_STORAGE_KEY, 'true');
    } catch (error) {
      console.warn(
        'Could not save the contact submission flag locally.',
        error,
      );
      // Sending still succeeds if the browser blocks local storage.
    }
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }
}
