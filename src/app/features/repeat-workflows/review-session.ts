import { Injectable } from '@angular/core';
import { CheckSettings, ModelUnits } from './mesh-workflows';
import { QueueEntry } from './collection-report';

export const ReviewDestination = {
  Preflight: 'preflight',
  Viewer: 'viewer',
  Compare: 'compare',
} as const;
export type ReviewDestination =
  (typeof ReviewDestination)[keyof typeof ReviewDestination];
interface Handoff {
  readonly file: File;
  readonly unit: ModelUnits;
  readonly destination: ReviewDestination;
}
/** Bounded tab memory only. Never serialise this service to storage or URLs. */
@Injectable({ providedIn: 'root' })
export class ReviewSession {
  collection: {
    rows: readonly QueueEntry[];
    files: readonly File[];
    settings: CheckSettings;
    date: string;
    reference: string;
  } | null = null;
  private pending: Handoff | null = null;
  offer(file: File, unit: ModelUnits, destination: ReviewDestination): void {
    this.pending = { file, unit, destination };
  }
  take(destination: ReviewDestination): Handoff | null {
    if (this.pending?.destination !== destination) {
      return null;
    }
    const handoff = this.pending;
    this.pending = null;
    return handoff;
  }
  clear(): void {
    this.collection = null;
    this.pending = null;
  }
}
