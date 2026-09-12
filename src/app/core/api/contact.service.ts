import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from './api-config';

export interface ContactMessage {
  readonly reason: string;
  readonly name: string;
  readonly email: string;
  readonly message: string;
  readonly context: string;
  readonly website: string;
  readonly turnstileToken: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  send(message: ContactMessage): Observable<void> {
    return this.http.post<void>(`${this.config.baseUrl}/contact`, message);
  }
}
