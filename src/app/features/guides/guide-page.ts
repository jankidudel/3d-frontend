import { Component, inject, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NewsletterSignupComponent } from '../../core/components/newsletter-signup/newsletter-signup';
import { SeoService } from '../../core/seo/seo.service';
import { Guide, guideBySlug } from './generated/guides.generated';

@Component({
  selector: 'app-guide-page',
  imports: [NewsletterSignupComponent],
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
      structuredData: this.structuredData(),
    });
  }

  private guideForRoute(): Guide {
    const slug = this.route.snapshot.paramMap.get('guideSlug');
    if (slug && slug in guideBySlug) {
      return guideBySlug[slug];
    }
    throw new Error('A guide route must resolve to a known guide.');
  }

  private structuredData(): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: this.guide.heading,
          description: this.guide.description,
          datePublished: this.guide.publishDate,
        },
        {
          '@type': 'FAQPage',
          mainEntity: this.guide.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        },
      ],
    };
  }
}
