import { Component, inject, input } from '@angular/core';
import { SubscriptionFormComponent } from '../subscription-form/subscription-form';
import { SubscriptionPreferencesService } from '../subscription-form/subscription-preferences.service';

@Component({
  selector: 'app-newsletter-signup',
  imports: [SubscriptionFormComponent],
  templateUrl: './newsletter-signup.html',
  styleUrl: './newsletter-signup.scss',
})
export class NewsletterSignupComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly idPrefix = input.required<string>();
  readonly compact = input(false);
  readonly placeholder = input('Email for updates');
  readonly buttonLabel = input('Keep me updated');
  protected readonly subscribed = inject(SubscriptionPreferencesService)
    .subscribed;
}
