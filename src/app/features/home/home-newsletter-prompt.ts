import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
import { SubscriptionFormComponent } from '../../core/components/subscription-form/subscription-form';
import { SubscriptionPreferencesService } from '../../core/components/subscription-form/subscription-preferences.service';

export const NEWSLETTER_PROMPT_DISMISSAL_STORAGE_KEY =
  'newsletter_prompt_dismissed_until_v1';
const DISMISSAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const DISPLAY_DELAY_MS = 10_000;

@Component({
  selector: 'app-home-newsletter-prompt',
  imports: [SubscriptionFormComponent],
  templateUrl: './home-newsletter-prompt.html',
  styleUrl: './home-newsletter-prompt.scss',
})
export class HomeNewsletterPromptComponent {
  protected readonly visible = signal(false);
  protected readonly expanded = signal(false);
  protected readonly subscriptionSucceeded = signal(false);
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(AnalyticsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly preferences = inject(SubscriptionPreferencesService);
  private shown = false;

  constructor() {
    if (this.isBrowser) {
      afterNextRender(() => this.initialise());
    }
  }

  protected open(): void {
    if (!this.visible() || this.expanded()) {
      return;
    }
    this.expanded.set(true);
    this.analytics.trackNewsletterPrompt(AnalyticsEvent.NewsletterPromptOpened);
  }

  protected dismiss(): void {
    this.save(
      NEWSLETTER_PROMPT_DISMISSAL_STORAGE_KEY,
      String(Date.now() + DISMISSAL_DURATION_MS),
    );
    this.visible.set(false);
    this.expanded.set(false);
    this.analytics.trackNewsletterPrompt(
      AnalyticsEvent.NewsletterPromptDismissed,
    );
  }

  protected subscribed(): void {
    this.subscriptionSucceeded.set(true);
    this.analytics.trackNewsletterPrompt(
      AnalyticsEvent.NewsletterPromptSubmitted,
    );
    this.document.defaultView?.setTimeout(() => {
      this.visible.set(false);
      this.expanded.set(false);
    }, 5_000);
  }

  private initialise(): void {
    if (this.isSuppressed()) {
      return;
    }
    const browserWindow = this.document.defaultView;
    if (!browserWindow) {
      return;
    }

    browserWindow.setTimeout(() => this.maybeShow(), DISPLAY_DELAY_MS);
  }

  private maybeShow(): void {
    if (this.shown || this.isSuppressed()) {
      return;
    }
    this.shown = true;
    this.visible.set(true);
    // Appear as a compact tab on every screen size. An auto-expanded panel
    // covered page content (tables, comparison cells) until dismissed.
    this.expanded.set(false);
    this.analytics.trackNewsletterPrompt(
      AnalyticsEvent.NewsletterPromptDisplayed,
    );
  }

  private isSuppressed(): boolean {
    if (this.preferences.subscribed()) {
      return true;
    }
    const dismissedUntil = Number(
      this.load(NEWSLETTER_PROMPT_DISMISSAL_STORAGE_KEY),
    );
    return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
  }

  private load(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private save(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // The prompt remains functional if storage is unavailable.
    }
  }
}
