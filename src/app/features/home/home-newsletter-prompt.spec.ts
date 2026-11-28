import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  HomeNewsletterPromptComponent,
  NEWSLETTER_PROMPT_DISMISSAL_STORAGE_KEY,
} from './home-newsletter-prompt';
import { NEWSLETTER_SUBSCRIBED_STORAGE_KEY } from '../../core/components/subscription-form/subscription-preferences.service';

describe('HomeNewsletterPromptComponent', () => {
  beforeEach(() => {
    localStorage.removeItem(NEWSLETTER_PROMPT_DISMISSAL_STORAGE_KEY);
    localStorage.removeItem(NEWSLETTER_SUBSCRIBED_STORAGE_KEY);
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [HomeNewsletterPromptComponent],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a compact tab after ten seconds and opens the panel on request', async () => {
    const fixture = TestBed.createComponent(HomeNewsletterPromptComponent);
    fixture.detectChanges();
    await Promise.resolve();

    vi.advanceTimersByTime(9_999);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('aside')).toBeNull();

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    const tab = fixture.nativeElement.querySelector('.prompt-tab');
    expect(tab).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.prompt-panel')).toBeNull();

    tab.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.prompt-panel')).not.toBeNull();
  });
});
