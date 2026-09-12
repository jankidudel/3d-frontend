import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from './api-config';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  let http: HttpTestingController;
  let service: SubscriptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { baseUrl: '/api/v1' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(SubscriptionService);
  });

  afterEach(() => http.verify());

  it('posts the email and verification token to subscriptions', () => {
    service
      .subscribe({
        email: 'ada@example.com',
        website: '',
        turnstileToken: 'token',
      })
      .subscribe();

    const request = http.expectOne('/api/v1/subscriptions');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'ada@example.com',
      website: '',
      turnstileToken: 'token',
    });
    request.flush({ status: 'accepted' });
  });
});
