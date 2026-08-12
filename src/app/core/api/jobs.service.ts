import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateJobRequest } from '../../models/create-job-request';
import { Job } from '../../models/job';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  createJob(request: CreateJobRequest): Observable<Job> {
    return this.http.post<Job>(`${this.config.baseUrl}/jobs`, request);
  }

  getJob(id: string): Observable<Job> {
    return this.http.get<Job>(`${this.config.baseUrl}/jobs/${encodeURIComponent(id)}`);
  }
}
