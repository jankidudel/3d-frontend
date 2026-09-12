import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export const NEWSLETTER_SUBSCRIBED_STORAGE_KEY =
  'homepage_newsletter_subscribed_v1';

@Injectable({ providedIn: 'root' })
export class SubscriptionPreferencesService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly subscribed = signal(this.loadSubscribed());

  markSubscribed(): void {
    this.subscribed.set(true);
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(NEWSLETTER_SUBSCRIBED_STORAGE_KEY, 'true');
    } catch (error) {
      console.warn(
        'Could not save the newsletter subscription flag locally.',
        error,
      );
    }
  }

  private loadSubscribed(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    try {
      return localStorage.getItem(NEWSLETTER_SUBSCRIBED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
