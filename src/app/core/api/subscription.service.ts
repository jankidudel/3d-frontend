import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from './api-config';

export interface SubscriptionRequest {
  readonly email: string;
  readonly website: string;
  readonly turnstileToken: string;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  subscribe(request: SubscriptionRequest): Observable<void> {
    return this.http.post<void>(
      `${this.config.baseUrl}/subscriptions`,
      request,
    );
  }
}
