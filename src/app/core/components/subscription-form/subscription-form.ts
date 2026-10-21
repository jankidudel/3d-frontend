import {
  afterNextRender,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { SubscriptionService } from '../../api/subscription.service';
import {
  responsiveTurnstileSize,
  TurnstileService,
} from '../../contact/turnstile.service';
import { SITE_CONFIG } from '../../site/site-config';
import { SubscriptionPreferencesService } from './subscription-preferences.service';

@Component({
  selector: 'app-subscription-form',
  templateUrl: './subscription-form.html',
  styleUrl: './subscription-form.scss',
})
export class SubscriptionFormComponent {
  readonly idPrefix = input.required<string>();
  readonly buttonLabel = input('Keep me updated');
  readonly inlineLabel = input<string>();
  readonly label = input('Email for InspectMesh updates');
  readonly placeholder = input('Email for updates');
  readonly subscriptionSucceeded = output<void>();
  protected readonly email = signal('');
  protected readonly honeypot = signal('');
  protected readonly captchaToken = signal('');
  protected readonly error = signal('');
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly captchaLoading = signal(false);
  protected readonly captchaError = signal('');
  protected readonly submitDisabled = computed(
    () => this.submitting() || !this.captchaAvailable || !this.captchaToken(),
  );
  protected readonly emailInvalid = computed(() =>
    /^(Enter a valid email address|Email address must)/.test(this.error()),
  );
  private readonly siteConfig = inject(SITE_CONFIG);
  protected readonly captchaAvailable = Boolean(
    this.siteConfig.contactCaptchaSiteKey,
  );
  private readonly captchaSiteKey = this.siteConfig.contactCaptchaSiteKey;
  private readonly subscriptions = inject(SubscriptionService);
  private readonly preferences = inject(SubscriptionPreferencesService);
  private readonly turnstile = inject(TurnstileService);
  private captchaWidgetId?: string;

  constructor() {
    afterNextRender(() => {
      if (this.captchaAvailable) {
        void this.renderCaptcha();
      }
    });
  }

  protected update(field: 'email' | 'honeypot', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'email') {
      this.email.set(value);
    } else {
      this.honeypot.set(value);
    }
    this.error.set('');
    this.submitted.set(false);
  }

  protected subscribe(event: SubmitEvent): void {
    event.preventDefault();
    const email = this.email().trim();
    if (this.honeypot()) {
      return;
    }
    if (!this.validateEmail(email)) {
      return;
    }
    if (!this.captchaAvailable) {
      this.error.set('Newsletter sign-up is not available at the moment.');
      return;
    }
    if (!this.captchaToken()) {
      this.error.set('Complete verification to subscribe.');
      return;
    }
    this.sendSubscription(email);
  }

  private sendSubscription(email: string): void {
    if (this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.subscriptions
      .subscribe({
        email,
        website: this.honeypot(),
        turnstileToken: this.captchaToken(),
      })
      .subscribe({
        next: () => {
          this.email.set('');
          this.honeypot.set('');
          this.error.set('');
          this.submitted.set(true);
          this.submitting.set(false);
          this.resetCaptcha();
          this.preferences.markSubscribed();
          this.subscriptionSucceeded.emit();
        },
        error: (response: { error?: { error?: unknown } }) => {
          const message = response.error?.error;
          this.error.set(
            typeof message === 'string'
              ? message
              : 'We could not save your subscription. Please try again.',
          );
          this.submitting.set(false);
          this.resetCaptcha();
        },
      });
  }

  protected validateOnBlur(): void {
    const email = this.email().trim();
    if (email) {
      this.validateEmail(email);
    }
  }

  private validateEmail(email: string): boolean {
    if (!this.isValidEmail(email)) {
      this.error.set('Enter a valid email address.');
      return false;
    }
    if (email.length > 254) {
      this.error.set('Email address must be 254 characters or fewer.');
      return false;
    }
    this.error.set('');
    return true;
  }

  private async renderCaptcha(): Promise<void> {
    const element = document.getElementById(`${this.idPrefix()}-turnstile`);
    if (
      !element ||
      !this.captchaSiteKey ||
      this.captchaWidgetId ||
      this.captchaLoading()
    ) {
      return;
    }
    this.captchaLoading.set(true);
    try {
      const turnstile = await this.turnstile.load();
      this.captchaWidgetId = turnstile.render(element, {
        sitekey: this.captchaSiteKey,
        size: responsiveTurnstileSize(window.innerWidth),
        callback: (token) => {
          this.captchaToken.set(token);
          this.error.set('');
        },
        'expired-callback': () => {
          this.captchaToken.set('');
        },
        'error-callback': () => {
          this.captchaToken.set('');
          this.captchaError.set(
            'CAPTCHA could not load. Please refresh and try again.',
          );
        },
      });
    } catch {
      this.captchaError.set(
        'CAPTCHA could not load. Please refresh and try again.',
      );
    } finally {
      this.captchaLoading.set(false);
    }
  }

  private resetCaptcha(): void {
    this.captchaToken.set('');
    this.captchaError.set('');
    if (this.captchaWidgetId) {
      window.turnstile?.reset(this.captchaWidgetId);
    }
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
