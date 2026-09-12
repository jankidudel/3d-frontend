import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NEWSLETTER_SUBSCRIBED_STORAGE_KEY } from '../subscription-form/subscription-preferences.service';
import { SubscriptionFormComponent } from '../subscription-form/subscription-form';
import { NewsletterSignupComponent } from './newsletter-signup';

describe('NewsletterSignupComponent', () => {
  beforeEach(() => {
    localStorage.removeItem(NEWSLETTER_SUBSCRIBED_STORAGE_KEY);
    TestBed.configureTestingModule({ imports: [NewsletterSignupComponent] });
  });

  afterEach(() => {
    localStorage.removeItem(NEWSLETTER_SUBSCRIBED_STORAGE_KEY);
  });

  it('does not show a past subscription as a new success message', () => {
    localStorage.setItem(NEWSLETTER_SUBSCRIBED_STORAGE_KEY, 'true');
    const fixture = TestBed.createComponent(NewsletterSignupComponent);
    fixture.componentRef.setInput('title', 'Newsletter');
    fixture.componentRef.setInput('description', 'Updates');
    fixture.componentRef.setInput('idPrefix', 'test-subscribe');
    fixture.componentRef.setInput(
      'showSuccessOnlyAfterCurrentSubscription',
      true,
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain(
      'Successfully subscribed.',
    );
    expect(
      fixture.nativeElement.querySelector('app-subscription-form'),
    ).not.toBeNull();
  });

  it('shows the success message after this form submits successfully', () => {
    const fixture = TestBed.createComponent(NewsletterSignupComponent);
    fixture.componentRef.setInput('title', 'Newsletter');
    fixture.componentRef.setInput('description', 'Updates');
    fixture.componentRef.setInput('idPrefix', 'test-subscribe');
    fixture.componentRef.setInput(
      'showSuccessOnlyAfterCurrentSubscription',
      true,
    );
    fixture.detectChanges();

    const form = fixture.debugElement.query(
      By.directive(SubscriptionFormComponent),
    ).componentInstance as SubscriptionFormComponent;
    form.subscriptionSucceeded.emit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Successfully subscribed.',
    );
  });
});
