import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateJobRequest } from '../../models/create-job-request';
import { Job } from '../../models/job';
import { API_CONFIG } from './api-config';
import { FormatJobService } from './format-job.service';

@Injectable({ providedIn: 'root' })
export class ThreeMfJobService implements FormatJobService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  create(request: CreateJobRequest): Observable<Job> {
    return this.http.post<Job>(`${this.config.baseUrl}/3mf-jobs`, request);
  }
}
