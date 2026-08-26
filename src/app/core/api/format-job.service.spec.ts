import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from './api-config';
import { StlJobService } from './stl-job.service';
import { ThreeMfJobService } from './three-mf-job.service';

describe('format job services', () => {
  const request = { fileName: 'model.3mf', fileSizeBytes: 42 };
  const job = {
    id: 'abc',
    fileName: request.fileName,
    fileSizeBytes: request.fileSizeBytes,
    status: 'created' as const,
    createdAt: '2026-08-12T21:08:08Z',
  };
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { baseUrl: '/api' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps STL creation in the STL job service', () => {
    TestBed.inject(StlJobService).create(request).subscribe();
    const requestCall = http.expectOne('/api/jobs');
    expect(requestCall.request.body).toEqual(request);
    requestCall.flush(job);
  });

  it('keeps 3MF creation in the 3MF job service', () => {
    TestBed.inject(ThreeMfJobService).create(request).subscribe();
    const requestCall = http.expectOne('/api/3mf-jobs');
    expect(requestCall.request.body).toEqual(request);
    requestCall.flush(job);
  });
});
