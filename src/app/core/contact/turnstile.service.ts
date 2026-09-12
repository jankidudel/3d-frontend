import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

interface Turnstile {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ): string;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

@Injectable({ providedIn: 'root' })
export class TurnstileService {
  private readonly document = inject(DOCUMENT);
  private loading?: Promise<Turnstile>;

  load(): Promise<Turnstile> {
    if (window.turnstile) {
      return Promise.resolve(window.turnstile);
    }
    if (!this.loading) {
      this.loading = new Promise<Turnstile>((resolve, reject) => {
        const script = this.document.createElement('script');
        script.src =
          'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (window.turnstile) {
            resolve(window.turnstile);
          } else {
            reject(new Error('Turnstile did not load.'));
          }
        };
        script.onerror = () => reject(new Error('Turnstile could not load.'));
        this.document.head.appendChild(script);
      });
    }
    return this.loading;
  }
}
