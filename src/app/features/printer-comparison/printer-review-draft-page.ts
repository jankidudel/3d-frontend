import { Component, inject } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'app-printer-review-draft-page',
  template: `<main class="page">
    <h1>Printer review draft</h1>
    <p>
      This unpublished template requires recorded unit access, disclosure,
      dates, firmware, slicer, materials and repeatable test notes before it can
      publish.
    </p>
    <p>
      No rating, review structured data or hands-on claims appear for drafts.
    </p>
  </main>`,
})
export class PrinterReviewDraftPage {
  constructor() {
    inject(SeoService).applyNoIndex(
      'Printer review draft | InspectMesh',
      'Unpublished hands-on review workflow.',
    );
  }
}
