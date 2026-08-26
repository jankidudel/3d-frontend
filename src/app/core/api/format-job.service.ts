import { Observable } from 'rxjs';
import { CreateJobRequest } from '../../models/create-job-request';
import { Job } from '../../models/job';

export interface FormatJobService {
  create(request: CreateJobRequest): Observable<Job>;
}
