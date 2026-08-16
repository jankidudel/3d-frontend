import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from './api-config';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  let service: JobsService;
  let http: HttpTestingController;
  const job = {
    id: 'abc',
    fileName: 'rotor.stl',
    fileSizeBytes: 42,
    status: 'created' as const,
    createdAt: '2026-08-12T21:08:08Z',
    upload: {
      url: 'https://uploads.example.com/jobs/abc/input.stl?signature=abc',
      method: 'POST' as const,
      fields: { key: 'jobs/abc/input.stl', policy: 'signed-policy' },
      expiresAt: '2026-08-12T21:23:08Z',
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { baseUrl: '/api' } },
      ],
    });
    service = TestBed.inject(JobsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('POSTs a create-job request', () => {
    service
      .createJob({ fileName: 'rotor.stl', fileSizeBytes: 42 })
      .subscribe((value) => expect(value).toEqual(job));
    const request = http.expectOne('/api/jobs');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      fileName: 'rotor.stl',
      fileSizeBytes: 42,
    });
    request.flush(job);
  });

  it('GETs a job by encoded id', () => {
    service.getJob('a/b').subscribe((value) => expect(value).toEqual(job));
    const request = http.expectOne('/api/jobs/a%2Fb');
    expect(request.request.method).toBe('GET');
    request.flush(job);
  });

  it('POSTs the selected file with the presigned form fields', () => {
    const file = new File(['solid mesh'], 'rotor.stl');

    service
      .uploadFile(job.upload, file)
      .subscribe((value) => expect(value).toBeUndefined());

    const request = http.expectOne(job.upload.url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    const body = request.request.body as FormData;
    expect(body.get('key')).toBe('jobs/abc/input.stl');
    expect(body.get('policy')).toBe('signed-policy');
    expect(body.get('file')).toBe(file);
    expect(request.request.responseType).toBe('text');
    request.flush('');
  });
});
