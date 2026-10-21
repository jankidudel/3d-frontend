import { Injectable } from '@angular/core';
import { JobCostInputs, jobRecord } from '../print-cost/job-cost';
export const PlanningDestination = {
  Price: 'price',
  Spool: 'spool',
  Finish: 'finish',
  Cost: 'cost',
} as const;
export type PlanningDestination =
  (typeof PlanningDestination)[keyof typeof PlanningDestination];
export interface PlanningOffer {
  destination: PlanningDestination;
  value: number;
  basis: string;
  currency?: string;
  plannedQuantity?: number;
  gcodeSource?: boolean;
  sliced?: { hours: number | null; grams: number | null };
  record?: NonNullable<ReturnType<typeof jobRecord>>;
}
/** Explicit offers and drafts live in tab memory only, never URLs or storage. */
@Injectable({ providedIn: 'root' })
export class JobPlanningSession {
  jobDraft: JobCostInputs | null = null;
  priceSource: PlanningOffer['record'] | null = null;
  plannerDrafts: Record<
    string,
    {
      values: Record<string, number>;
      start: string;
      zone: string;
      material: string;
      basis: string;
    }
  > = {};
  priceDraft: Record<string, number | string | boolean> | null = null;
  private pending: PlanningOffer | null = null;
  offer(offer: PlanningOffer): void {
    this.pending = structuredClone(offer);
  }
  invalidateGcodeOffers(): void {
    if (this.pending?.gcodeSource) {
      this.pending = null;
    }
  }
  hasOffer(destination: PlanningDestination): boolean {
    return this.pending?.destination === destination;
  }
  peek(destination: PlanningDestination): PlanningOffer | null {
    return this.pending?.destination === destination
      ? structuredClone(this.pending)
      : null;
  }
  take(destination: PlanningDestination): PlanningOffer | null {
    if (this.pending?.destination !== destination) {
      return null;
    }
    const offer = this.pending;
    this.pending = null;
    return offer;
  }
}
