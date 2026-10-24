import type { QuotationFamily } from './quotation-versions';
import { Injectable } from '@angular/core';
import {
  type QuotationDraft,
  type QuoteHandoff,
  validateHandoff,
} from './quotation';

/** Quotation snapshots live in this tab's application memory until explicitly saved. */
@Injectable({ providedIn: 'root' })
export class QuotationSession {
  draft: QuotationDraft | null = null;
  family: QuotationFamily | null = null;
  private pending: QuoteHandoff | null = null;
  offer(value: QuoteHandoff): void {
    this.pending = validateHandoff(value);
  }
  peek(): QuoteHandoff | null {
    return this.pending ? structuredClone(this.pending) : null;
  }
  take(): QuoteHandoff | null {
    const offer = this.peek();
    this.pending = null;
    return offer;
  }
}
