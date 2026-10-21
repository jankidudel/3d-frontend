import {
  afterNextRender,
  computed,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type CookieConsentChoice = 'accepted' | 'rejected';

const STORAGE_KEY = 'cookie_consent_v1';

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly browserReady = signal(false);
  private readonly choice = signal<CookieConsentChoice | null>(
    this.readStoredChoice(),
  );

  readonly bannerVisible = computed(
    () => this.browserReady() && this.choice() === null,
  );
  readonly analyticsAllowed = computed(() => this.choice() === 'accepted');

  constructor() {
    afterNextRender(() => this.browserReady.set(true));
  }

  accept(): void {
    this.saveChoice('accepted');
  }

  reject(): void {
    this.saveChoice('rejected');
  }

  changeChoice(): void {
    this.choice.set(null);
    if (this.isBrowser) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // The in-memory consent choice remains usable when storage is denied.
      }
    }
  }

  private readStoredChoice(): CookieConsentChoice | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      const storedChoice = localStorage.getItem(STORAGE_KEY);
      return storedChoice === 'accepted' || storedChoice === 'rejected'
        ? storedChoice
        : null;
    } catch {
      return null;
    }
  }

  private saveChoice(choice: CookieConsentChoice): void {
    this.choice.set(choice);
    if (this.isBrowser) {
      try {
        localStorage.setItem(STORAGE_KEY, choice);
      } catch {
        // Consent lasts in this tab only when browser storage is unavailable.
      }
    }
  }
}
