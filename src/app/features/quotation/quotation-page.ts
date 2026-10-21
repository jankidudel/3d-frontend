import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import {
  AnalyticsService,
  AnalyticsEvent,
} from '../../core/analytics/analytics.service';
import { PlannerCurrency } from '../repeat-workflows/currency-preference';
import { QuotationSession } from './quotation-session';
import { createQuotationPdf } from './quotation-pdf';
import { decodeQuoteLogo, validateDraftLogo } from './quotation-logo';
import {
  ACCEPTANCE_NOTICE,
  DeliveryMode,
  MAX_DRAFT_BYTES,
  MODEL_STATUS,
  QUOTE_STORAGE_KEY,
  QuoteSource,
  TAX_NOTICE,
  blankQuotation,
  customerQuotation,
  formatQuoteMoney,
  loadQuotation,
  parseQuotation,
  populatedQuotation,
  quotationFromPrice,
  quotationIssues,
  quotationCharges,
  sampleQuotation,
  saveQuotation,
  serializeQuotation,
  textLimits,
  type CustomerQuotation,
  type QuotationDraft,
  type QuoteTextKey,
} from './quotation';

interface TextField {
  key: QuoteTextKey;
  label: string;
  multiline?: boolean;
}
interface EditorSection {
  title: string;
  fields: readonly TextField[];
}
@Component({
  selector: 'app-quotation-page',
  imports: [FormField, RouterLink],
  templateUrl: './quotation-page.html',
  styleUrl: './quotation-page.scss',
})
export class QuotationPage {
  private readonly session = inject(QuotationSession);
  private readonly analytics = inject(AnalyticsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly routes = PublicRouteUrl;
  readonly draft = signal<QuotationDraft>(
    this.session.draft
      ? structuredClone(this.session.draft)
      : blankQuotation(''),
  );
  readonly fields = form(this.draft, (path) => {
    for (const key of Object.keys(textLimits) as QuoteTextKey[]) {
      maxLength(path[key], textLimits[key]);
    }
    maxLength(path.quantity, 6);
    maxLength(path.orderPrice, 40);
    maxLength(path.deliveryAmount, 40);
  });
  readonly deliveryModes = DeliveryMode;
  readonly sources = QuoteSource;
  readonly currencies = Object.values(PlannerCurrency);
  readonly limits = textLimits;
  readonly modelStatus = MODEL_STATUS;
  readonly taxNotice = TAX_NOTICE;
  readonly acceptanceNotice = ACCEPTANCE_NOTICE;
  readonly pending = signal(this.session.peek());
  readonly message = signal('');
  readonly error = signal('');
  readonly savedAt = signal('');
  readonly hasSaved = signal(false);
  readonly busy = signal(false);
  readonly previewOnly = signal(false);
  readonly preview = signal<CustomerQuotation | null>(null);
  readonly charges = computed(() => quotationCharges(this.draft()));
  readonly issues = computed(() => quotationIssues(this.draft(), true));
  readonly sourceLabel = computed(() =>
    this.draft().source === QuoteSource.Calculator
      ? 'Imported from the price calculator'
      : this.draft().source === QuoteSource.Example
        ? 'Fictional example'
        : 'Entered manually',
  );
  readonly sections: readonly EditorSection[] = [
    {
      title: 'Business and customer',
      fields: [
        { key: 'businessName', label: 'Business name' },
        { key: 'businessEmail', label: 'Contact email (optional)' },
        {
          key: 'address',
          label: 'Business address (optional)',
          multiline: true,
        },
        { key: 'customerName', label: 'Customer name / company' },
        { key: 'customerEmail', label: 'Customer contact email (optional)' },
      ],
    },
    {
      title: 'Quotation details',
      fields: [{ key: 'reference', label: 'Quote reference' }],
    },
    {
      title: 'Job specification',
      fields: [
        { key: 'jobTitle', label: 'Job title' },
        { key: 'material', label: 'Material' },
        { key: 'colour', label: 'Colour' },
        { key: 'finish', label: 'Finish' },
        { key: 'agreedScope', label: 'Agreed scope', multiline: true },
        { key: 'leadTime', label: 'Indicative lead time' },
        { key: 'deliveryScope', label: 'Delivery scope', multiline: true },
      ],
    },
    {
      title: 'Model reference',
      fields: [
        { key: 'modelFilename', label: 'Filename (optional)' },
        { key: 'revision', label: 'Revision label (optional)' },
        {
          key: 'units',
          label: 'Declared STL units / 3MF metadata note (optional)',
        },
        {
          key: 'reviewNotes',
          label: 'Customer-visible review notes (optional)',
          multiline: true,
        },
      ],
    },
    { title: 'Customer price', fields: [] },
    {
      title: 'Scope and terms',
      fields: [
        { key: 'includedWork', label: 'Included work', multiline: true },
        { key: 'exclusions', label: 'Exclusions', multiline: true },
        {
          key: 'paymentInstructions',
          label: 'Payment instructions',
          multiline: true,
        },
      ],
    },
  ];
  constructor() {
    inject(SeoService).apply({
      title: '3D Printing Quote Generator — Branded Quotations | InspectMesh',
      description:
        'Turn your 3D printing price into a branded customer quotation. Add job specifications, a model reference and terms, then preview and download a PDF.',
      path: PublicRouteUrl.QuoteGenerator,
    });
    effect(() => {
      this.session.draft = structuredClone(this.draft());
    });
    afterNextRender(() => {
      if (!this.draft().issueDate) {
        this.draft.set(blankQuotation());
      }
      if (this.pending() && !populatedQuotation(this.draft())) {
        this.applyPrice();
      }
      this.refreshSaved();
      this.track(AnalyticsEvent.QuoteOpened);
    });
  }
  fieldError(key: string): string {
    return this.issues().find((issue) => issue.field === key)?.message ?? '';
  }
  edited(): void {
    this.draft.update((draft) => ({ ...draft, reviewed: false }));
    this.preview.set(null);
    this.error.set('');
  }
  reviewed(event: Event): void {
    this.draft.update((draft) => ({
      ...draft,
      reviewed: (event.target as HTMLInputElement).checked,
    }));
    this.preview.set(null);
    this.track(AnalyticsEvent.QuoteReviewed);
  }
  private track(
    event:
      | typeof AnalyticsEvent.QuoteOpened
      | typeof AnalyticsEvent.QuoteReviewed
      | typeof AnalyticsEvent.QuotePreviewed
      | typeof AnalyticsEvent.QuotePdfExported,
  ): void {
    this.analytics.trackQuotation(
      event,
      this.draft().source,
      this.draft().reviewed,
      this.draft().fictionalExample,
    );
  }
  private replaceAllowed(): boolean {
    return (
      !populatedQuotation(this.draft()) ||
      window.confirm(
        'Replace this populated quotation draft? Download an editable draft first if you want to keep it.',
      )
    );
  }
  applyPrice(): void {
    const offer = this.pending();
    if (!offer || !this.replaceAllowed()) {
      return;
    }
    this.draft.set(quotationFromPrice(offer));
    this.session.take();
    this.pending.set(null);
    this.preview.set(null);
    this.message.set(
      'Imported a historical order price. Review the selling price and job scope before export.',
    );
  }
  loadExample(): void {
    if (!this.replaceAllowed()) {
      return;
    }
    this.draft.set(sampleQuotation());
    this.preview.set(null);
    this.message.set(
      'Fictional example loaded. No customer details are needed to try it.',
    );
    this.track(AnalyticsEvent.QuoteOpened);
  }
  showPreview(): void {
    const customer = customerQuotation(this.draft());
    if (!customer) {
      this.error.set(
        'Complete the highlighted details and review the selling price before preview or PDF export.',
      );
      this.host.nativeElement
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    this.preview.set(customer);
    this.previewOnly.set(true);
    this.error.set('');
    this.track(AnalyticsEvent.QuotePreviewed);
    setTimeout(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>('#customer-preview-heading')
          ?.focus(),
      0,
    );
  }
  async downloadPdf(): Promise<void> {
    const customer = customerQuotation(this.draft());
    if (!customer || this.busy()) {
      this.showPreview();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const pdf = await createQuotationPdf(customer);
      await pdf.save('inspectmesh-customer-quotation.pdf', {
        returnPromise: true,
      });
      this.message.set(
        'Customer quotation PDF downloaded. Send it using your own business process.',
      );
      this.track(AnalyticsEvent.QuotePdfExported);
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The quotation PDF could not be created. Try again.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  downloadDraft(): void {
    try {
      const text = serializeQuotation(this.draft());
      const url = URL.createObjectURL(
        new Blob([text], { type: 'application/json' }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'inspectmesh-editable-quotation.json';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.message.set(
        'Editable draft downloaded. It can contain customer details and internal pricing; keep it private.',
      );
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The editable draft could not be downloaded.',
      );
    }
  }
  async importDraft(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    try {
      if (file.size > MAX_DRAFT_BYTES) {
        throw new Error(
          'Editable drafts must be at most 1 MiB, including the logo.',
        );
      }
      const next = parseQuotation(await file.text());
      await validateDraftLogo(next.logo);
      if (!this.replaceAllowed()) {
        return;
      }
      this.draft.set(next);
      this.preview.set(null);
      this.error.set('');
      this.message.set(
        'Editable draft imported locally. Review its details before export.',
      );
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'This editable draft could not be imported. The current draft was kept.',
      );
    }
  }
  async addLogo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    try {
      const logo = await decodeQuoteLogo(file);
      const next = { ...this.draft(), logo, reviewed: false };
      serializeQuotation(next);
      this.draft.set(next);
      this.preview.set(null);
      this.error.set('');
      this.message.set('Logo decoded locally and added.');
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The logo could not be decoded.',
      );
    }
  }
  removeLogo(): void {
    this.draft.update((draft) => ({ ...draft, logo: null, reviewed: false }));
    this.preview.set(null);
  }
  save(): void {
    try {
      const savedAt = saveQuotation(localStorage, this.draft());
      this.savedAt.set(savedAt);
      this.hasSaved.set(true);
      this.message.set(
        'Draft saved. Stored in this browser only. Browser storage is not cloud backup.',
      );
      this.error.set('');
    } catch {
      this.error.set(
        'The draft could not be saved. Check the highlighted inputs, size limit and browser storage permissions. Download an editable draft instead.',
      );
    }
  }
  private refreshSaved(): void {
    try {
      const saved = loadQuotation(localStorage);
      this.hasSaved.set(!!saved);
      this.savedAt.set(saved?.savedAt ?? '');
    } catch {
      this.hasSaved.set(false);
      this.message.set(
        'Browser storage could not be read. Download or import an editable draft instead.',
      );
    }
  }
  async reopen(): Promise<void> {
    try {
      const saved = loadQuotation(localStorage);
      if (!saved) {
        this.message.set('There is no saved quotation in this browser.');
        return;
      }
      await validateDraftLogo(saved.draft.logo);
      if (!this.replaceAllowed()) {
        return;
      }
      this.draft.set(saved.draft);
      this.preview.set(null);
      this.error.set('');
      this.savedAt.set(saved.savedAt);
      this.message.set('Saved draft reopened. Stored in this browser only.');
    } catch {
      this.error.set(
        'The saved draft could not be reopened. The current draft was kept.',
      );
    }
  }
  clear(): void {
    if (
      (populatedQuotation(this.draft()) || this.hasSaved()) &&
      !window.confirm(
        'Clear this draft and this quotation tool’s saved draft in this browser? This cannot be undone unless you downloaded a copy.',
      )
    ) {
      return;
    }
    try {
      localStorage.removeItem(QUOTE_STORAGE_KEY);
    } catch {
      this.error.set(
        'Saved data could not be cleared. The current draft was kept; check browser storage permissions.',
      );
      return;
    }
    this.draft.set(blankQuotation());
    this.session.take();
    this.pending.set(null);
    this.preview.set(null);
    this.hasSaved.set(false);
    this.savedAt.set('');
    this.message.set(
      'Quotation draft cleared. Other InspectMesh data was not changed.',
    );
    this.error.set('');
  }
  money(cents: number, currency: PlannerCurrency): string {
    return formatQuoteMoney(cents, currency);
  }
}
