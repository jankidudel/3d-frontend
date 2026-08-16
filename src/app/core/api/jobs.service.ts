import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { CreateJobRequest } from '../../models/create-job-request';
import { Job, JobUpload } from '../../models/job';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  createJob(request: CreateJobRequest): Observable<Job> {
    return this.http.post<Job>(`${this.config.baseUrl}/jobs`, request);
  }

  uploadFile(upload: JobUpload, file: File): Observable<void> {
    const form = new FormData();
    for (const [name, value] of Object.entries(upload.fields)) {
      form.append(name, value);
    }
    form.append('file', file);
    return this.http
      .post(upload.url, form, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  getJob(id: string): Observable<Job> {
    return this.http.get<Job>(
      `${this.config.baseUrl}/jobs/${encodeURIComponent(id)}`,
    );
  }
}
