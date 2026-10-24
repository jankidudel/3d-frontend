import { GuideSlug } from '../guides/generated/guide-slug.generated';
import {
  ARCHIVE_SCHEMA,
  FAMILY_STORAGE_KEY,
  MAX_FAMILY_BYTES,
  keepQuotation,
  parseArchive,
  quotationFamily,
  quotationPdfFilename,
  reviseQuotation,
  saveFamily,
  serializeArchive,
  type QuotationFamily,
  type RetainedQuotation,
} from './quotation-versions';
import {
  PROFILE_STORAGE_KEY,
  applyProfile,
  changedProfileFields,
  parseProfile,
  saveProfile,
  type BusinessProfile,
} from './quotation-profile';
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
  MODEL_STATUS,
  QUOTE_STORAGE_KEY,
  QuoteSource,
  TAX_NOTICE,
  blankQuotation,
  customerQuotation,
  formatQuoteMoney,
  moneyCents,
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
  readonly guideSlug = GuideSlug;
  readonly draft = signal<QuotationDraft>(
    this.session.draft
      ? structuredClone(this.session.draft)
      : blankQuotation(''),
  );
  readonly family = signal<QuotationFamily>(
    this.session.family
      ? structuredClone(this.session.family)
      : quotationFamily(this.draft()),
  );
  readonly partialHistory = computed(
    () =>
      this.draft().versionNumber > 1 &&
      this.family().versions.every(
        (version) => version.draft.versionNumber > 1,
      ),
  );
  readonly retained = signal<RetainedQuotation | null>(null);
  readonly profile = signal<BusinessProfile | null>(null);
  readonly profileConfirmation = signal<string[] | null>(null);
  readonly priceConfirmation = signal(false);
  readonly currencyAcknowledged = signal(false);
  readonly specificationChanged = signal(false);
  readonly hasSavedFamily = signal(false);
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
      fields: [
        { key: 'reference', label: 'Quote reference' },
        { key: 'changeSummary', label: 'What changed?', multiline: true },
      ],
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
      this.session.family = {
        ...structuredClone(this.family()),
        current: structuredClone(this.draft()),
      };
    });
    afterNextRender(() => {
      if (!this.draft().issueDate) {
        this.setDraft(blankQuotation(), true);
      }
      if (this.pending() && !populatedQuotation(this.draft())) {
        this.applyPrice();
      }
      this.refreshSaved();
      this.refreshLocalRecords();
      this.track(AnalyticsEvent.QuoteOpened);
    });
  }
  fieldError(key: string): string {
    return this.issues().find((issue) => issue.field === key)?.message ?? '';
  }
  edited(field = ''): void {
    if (
      [
        'quantity',
        'material',
        'finish',
        'modelFilename',
        'revision',
        'units',
      ].includes(field)
    ) {
      this.specificationChanged.set(true);
    }
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
  applyPrice(confirmed = false): void {
    const offer = this.pending();
    if (!offer) {
      return;
    }
    const populated = populatedQuotation(this.draft());
    if (populated && !confirmed) {
      this.priceConfirmation.set(true);
      this.currencyAcknowledged.set(false);
      return;
    }
    if (
      populated &&
      offer.currency !== this.draft().currency &&
      !this.currencyAcknowledged()
    ) {
      this.error.set(
        'Acknowledge that changing currency does not convert amounts.',
      );
      return;
    }
    const previous = this.draft();
    this.setDraft(
      populated
        ? {
            ...previous,
            source: QuoteSource.Calculator,
            internal: structuredClone(offer),
            currency: offer.currency,
            quantity: String(offer.quantity),
            orderPrice: (moneyCents(offer.finalOrderPrice)! / 100).toFixed(2),
            reviewed: false,
          }
        : quotationFromPrice(offer),
      !populated,
    );
    this.priceConfirmation.set(false);
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
    this.setDraft(sampleQuotation(), true);
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
    this.retained.set(null);
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
    const customer =
      this.retained()?.customer ?? customerQuotation(this.draft());
    if (!customer || this.busy()) {
      this.showPreview();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const pdf = await createQuotationPdf(customer);
      await pdf.save(
        quotationPdfFilename(customer.reference, customer.versionNumber),
        {
          returnPromise: true,
        },
      );
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
      this.downloadJson(text, 'inspectmesh-editable-quotation.json');
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
    this.message.set('');
    if (!file) {
      return;
    }
    try {
      if (file.size > MAX_FAMILY_BYTES) {
        throw new Error('Quotation archives must be 4 MiB or smaller.');
      }
      const text = await file.text();
      const envelope = JSON.parse(text) as { schema?: string } | null;
      if (envelope?.schema === ARCHIVE_SCHEMA) {
        const family = parseArchive(text);
        await this.validateFamilyLogos(family);
        if (
          (populatedQuotation(this.draft()) || this.family().versions.length) &&
          !window.confirm(
            `Import quotation archive for ${family.current.reference || 'unnamed quotation'} with ${family.versions.length} retained versions? This replaces the current quotation family.`,
          )
        ) {
          return;
        }
        this.family.set(family);
        this.setDraft(family.current);
      } else {
        const next = parseQuotation(text);
        await validateDraftLogo(next.logo);
        if (!this.replaceAllowed()) {
          return;
        }
        this.setDraft(next, true);
      }
      this.error.set('');
      this.message.set(
        'Editable draft imported locally. Review its details before export.',
      );
    } catch (error: unknown) {
      this.error.set(
        `This file could not be imported. Your current draft has not changed. ${error instanceof Error ? error.message : 'Invalid quotation file.'}`,
      );
    }
  }

  async addLogo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.message.set('');
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
      this.setDraft(saved.draft, true);
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
      (populatedQuotation(this.draft()) ||
        this.hasSaved() ||
        this.hasSavedFamily() ||
        this.family().versions.length) &&
      !window.confirm(
        'Clear the current quotation family, draft and saved quotation records in this browser? Download a private archive first to keep a copy. The business profile and other tools are not changed.',
      )
    ) {
      return;
    }
    try {
      localStorage.removeItem(QUOTE_STORAGE_KEY);
      localStorage.removeItem(FAMILY_STORAGE_KEY);
    } catch {
      this.error.set(
        'Saved data could not be cleared. The current draft was kept; check browser storage permissions.',
      );
      return;
    }
    this.setDraft(blankQuotation(), true);
    this.hasSavedFamily.set(false);
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
  private setDraft(draft: QuotationDraft, resetFamily = false): void {
    this.draft.set(structuredClone(draft));
    if (resetFamily) {
      this.family.set(quotationFamily(draft));
    }
    this.returnToDraft();
    this.specificationChanged.set(false);
  }
  returnToDraft(): void {
    this.retained.set(null);
    this.preview.set(null);
    this.previewOnly.set(false);
  }
  private runLocal(action: () => void): void {
    this.message.set('');
    try {
      action();
      this.error.set('');
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Browser storage is unavailable. Your current draft has not changed.',
      );
    }
  }
  keepVersion(): void {
    this.runLocal(() => {
      this.family.set(keepQuotation(this.family(), this.draft()));
      this.message.set(
        'Kept locally in this tab. This does not record customer receipt or acceptance.',
      );
    });
  }
  createRevision(): void {
    this.runLocal(() => {
      const family = reviseQuotation(this.family(), this.draft());
      this.family.set(family);
      this.setDraft(family.current);
      this.message.set(
        'Revised quotation created. Describe what changed and review dates, scope and selling price.',
      );
    });
  }
  viewVersion(version: RetainedQuotation): void {
    this.retained.set(structuredClone(version));
    this.preview.set(structuredClone(version.customer));
    this.previewOnly.set(true);
    setTimeout(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>('#customer-preview-heading')
          ?.focus(),
      0,
    );
  }
  private downloadJson(text: string, filename: string): void {
    const url = URL.createObjectURL(
      new Blob([text], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  downloadArchive(): void {
    this.runLocal(() =>
      this.downloadJson(
        serializeArchive(this.family(), this.draft()),
        'inspectmesh-quotation-archive.json',
      ),
    );
  }
  saveVersions(): void {
    this.runLocal(() => {
      saveFamily(localStorage, this.family(), this.draft());
      this.hasSavedFamily.set(true);
      this.message.set(
        'Quotation versions saved in this browser. Later edits are not automatically saved. Browser storage is not a backup.',
      );
    });
  }
  async reopenVersions(): Promise<void> {
    try {
      const text = localStorage.getItem(FAMILY_STORAGE_KEY);
      if (!text) {
        throw new Error('No saved quotation versions in this browser.');
      }
      const family = parseArchive(text);
      await this.validateFamilyLogos(family);
      if (!this.replaceAllowed()) {
        return;
      }
      this.family.set(family);
      this.setDraft(family.current);
      this.error.set('');
      this.message.set(
        'Saved quotation versions reopened. Review the current draft before export.',
      );
    } catch (error: unknown) {
      this.error.set(
        `The saved versions could not be reopened. Your current draft has not changed. ${error instanceof Error ? error.message : 'Browser storage unavailable.'}`,
      );
    }
  }
  private async validateFamilyLogos(family: QuotationFamily): Promise<void> {
    for (const draft of [
      family.current,
      ...family.versions.map((version) => version.draft),
    ]) {
      await validateDraftLogo(draft.logo);
    }
  }
  private refreshLocalRecords(): void {
    try {
      const text = localStorage.getItem(PROFILE_STORAGE_KEY);
      this.profile.set(text ? parseProfile(text) : null);
      this.hasSavedFamily.set(!!localStorage.getItem(FAMILY_STORAGE_KEY));
    } catch {
      this.message.set(
        'Browser storage could not be read. You can continue in this tab and download private editable files.',
      );
    }
  }
  saveBusinessProfile(): void {
    this.runLocal(() => {
      this.profile.set(saveProfile(localStorage, this.draft()));
      this.message.set('Business profile saved in this browser');
    });
  }
  async applyBusinessProfile(confirmed = false): Promise<void> {
    try {
      const profile = this.profile();
      if (!profile) {
        throw new Error('No saved business profile.');
      }
      await validateDraftLogo(profile.logo);
      const changed = changedProfileFields(this.draft(), profile);
      if (changed.length && !confirmed) {
        this.profileConfirmation.set(
          changed.map(
            (field) =>
              ({
                businessName: 'Business name',
                businessEmail: 'Business email',
                address: 'Business address',
                logo: 'Business logo',
                paymentInstructions: 'Payment instructions',
              })[field] ?? field,
          ),
        );
        return;
      }
      const next = applyProfile(this.draft(), profile);
      this.draft.set(next);
      this.preview.set(null);
      this.profileConfirmation.set(null);
      this.message.set(
        'Business profile applied. Customer details and job prices have not changed.',
      );
      this.error.set('');
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The business profile could not be applied.',
      );
    }
  }
  removeBusinessProfile(): void {
    if (
      !window.confirm(
        'Remove the saved business profile? This does not remove quotations or change the current editor.',
      )
    ) {
      return;
    }
    this.runLocal(() => {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      this.profile.set(null);
      this.profileConfirmation.set(null);
      this.message.set(
        'Saved business profile removed. Quotations and the current editor have not changed.',
      );
    });
  }
  acknowledgeCurrency(event: Event): void {
    this.currencyAcknowledged.set((event.target as HTMLInputElement).checked);
  }
  localDate(value: string): string {
    return new Date(value).toLocaleString();
  }
  money(cents: number, currency: PlannerCurrency): string {
    return formatQuoteMoney(cents, currency);
  }
}
