import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
import { SubscriptionFormComponent } from '../../core/components/subscription-form/subscription-form';

export const NEWSLETTER_PROMPT_DISMISSAL_STORAGE_KEY =
  'homepage_newsletter_dismissed_until_v1';
export const NEWSLETTER_PROMPT_SUBSCRIBED_STORAGE_KEY =
  'homepage_newsletter_subscribed_v1';
export const CONTACT_SUBMITTED_STORAGE_KEY = 'contact_form_submitted_v1';
const DISMISSAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const ENGAGEMENT_SCROLL_RATIO = 0.4;
const MOBILE_QUERY = '(max-width: 42rem)';

@Component({
  selector: 'app-home-newsletter-prompt',
  imports: [SubscriptionFormComponent],
  templateUrl: './home-newsletter-prompt.html',
  styleUrl: './home-newsletter-prompt.scss',
})
export class HomeNewsletterPromptComponent {
  protected readonly visible = signal(false);
  protected readonly expanded = signal(false);
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(AnalyticsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private engaged = false;
  private delayElapsed = false;
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
    this.save(NEWSLETTER_PROMPT_SUBSCRIBED_STORAGE_KEY, 'true');
    this.visible.set(false);
    this.expanded.set(false);
    this.analytics.trackNewsletterPrompt(
      AnalyticsEvent.NewsletterPromptSubmitted,
    );
  }

  private initialise(): void {
    if (this.isSuppressed()) {
      return;
    }
    const browserWindow = this.document.defaultView;
    if (!browserWindow) {
      return;
    }

    browserWindow.setTimeout(() => {
      this.delayElapsed = true;
      this.maybeShow();
    }, 15_000);

    browserWindow.addEventListener('scroll', this.handleScroll, {
      passive: true,
    });
    this.document.addEventListener('pointerdown', this.handleInteraction, {
      passive: true,
    });
    this.destroyRef.onDestroy(() => {
      browserWindow.removeEventListener('scroll', this.handleScroll);
      this.document.removeEventListener('pointerdown', this.handleInteraction);
    });
  }

  private readonly handleScroll = (): void => {
    const browserWindow = this.document.defaultView;
    const root = this.document.documentElement;
    if (!browserWindow || !root) {
      return;
    }
    const scrollableHeight = root.scrollHeight - browserWindow.innerHeight;
    if (
      scrollableHeight > 0 &&
      browserWindow.scrollY / scrollableHeight >= ENGAGEMENT_SCROLL_RATIO
    ) {
      this.markEngaged();
    }
  };

  private readonly handleInteraction = (event: Event): void => {
    const target = event.target;
    if (target instanceof Element && target.closest('main')) {
      this.markEngaged();
    }
  };

  private markEngaged(): void {
    this.engaged = true;
    this.maybeShow();
  }

  private maybeShow(): void {
    if (
      !this.delayElapsed ||
      !this.engaged ||
      this.shown ||
      this.isSuppressed()
    ) {
      return;
    }
    this.shown = true;
    this.visible.set(true);
    this.expanded.set(!this.isMobile());
    this.analytics.trackNewsletterPrompt(
      AnalyticsEvent.NewsletterPromptDisplayed,
    );
  }

  private isSuppressed(): boolean {
    if (
      this.load(NEWSLETTER_PROMPT_SUBSCRIBED_STORAGE_KEY) === 'true' ||
      this.load(CONTACT_SUBMITTED_STORAGE_KEY) === 'true'
    ) {
      return true;
    }
    const dismissedUntil = Number(
      this.load(NEWSLETTER_PROMPT_DISMISSAL_STORAGE_KEY),
    );
    return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
  }

  private isMobile(): boolean {
    const browserWindow = this.document.defaultView;
    return typeof browserWindow?.matchMedia === 'function'
      ? browserWindow.matchMedia(MOBILE_QUERY).matches
      : false;
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
