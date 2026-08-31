import { Component, inject, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { Guide, guideBySlug } from './guides.generated';

@Component({
  selector: 'app-guide-page',
  templateUrl: './guide-page.html',
  styleUrl: './guide-page.scss',
  encapsulation: ViewEncapsulation.None,
})
export class GuidePage {
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  protected readonly guide: Guide = this.guideForRoute();

  constructor() {
    this.seo.apply({
      title: this.guide.title,
      description: this.guide.description,
      path: this.guide.slug,
      openGraphType: 'article',
      structuredData: this.faqStructuredData(),
    });
  }

  private guideForRoute(): Guide {
    const slug = this.route.snapshot.paramMap.get('guideSlug');
    if (slug && slug in guideBySlug) {
      return guideBySlug[slug];
    }
    throw new Error('A guide route must resolve to a known guide.');
  }

  private faqStructuredData(): Record<string, unknown> | undefined {
    if (this.guide.faqs.length === 0) {
      return undefined;
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: this.guide.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };
  }
}
