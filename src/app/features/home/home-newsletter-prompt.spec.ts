import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  CONTACT_SUBMITTED_STORAGE_KEY,
  HomeNewsletterPromptComponent,
  NEWSLETTER_PROMPT_DISMISSAL_STORAGE_KEY,
} from './home-newsletter-prompt';
import { NEWSLETTER_SUBSCRIBED_STORAGE_KEY } from '../../core/components/subscription-form/subscription-preferences.service';

describe('HomeNewsletterPromptComponent', () => {
  beforeEach(() => {
    localStorage.removeItem(NEWSLETTER_PROMPT_DISMISSAL_STORAGE_KEY);
    localStorage.removeItem(NEWSLETTER_SUBSCRIBED_STORAGE_KEY);
    localStorage.removeItem(CONTACT_SUBMITTED_STORAGE_KEY);
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [HomeNewsletterPromptComponent],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for both engagement and the delay before showing the panel', async () => {
    const fixture = TestBed.createComponent(HomeNewsletterPromptComponent);
    fixture.detectChanges();
    await Promise.resolve();

    vi.advanceTimersByTime(15_000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('aside')).toBeNull();

    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.prompt-panel')).toBeNull();

    const main = document.createElement('main');
    document.body.appendChild(main);
    main.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.prompt-panel')).not.toBeNull();
    main.remove();
  });

  it('does not show after a contact form has been submitted', async () => {
    localStorage.setItem(CONTACT_SUBMITTED_STORAGE_KEY, 'true');
    const fixture = TestBed.createComponent(HomeNewsletterPromptComponent);
    fixture.detectChanges();
    await Promise.resolve();

    const main = document.createElement('main');
    document.body.appendChild(main);
    main.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    vi.advanceTimersByTime(15_000);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('aside')).toBeNull();
    main.remove();
  });
});
