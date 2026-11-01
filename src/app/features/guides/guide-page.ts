import { guideRoutePath } from '../../core/seo/public-routes';
import {
  AfterViewInit,
  afterEveryRender,
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { Guide, guideBySlug } from './generated/guides.generated';

@Component({
  selector: 'app-guide-page',
  templateUrl: './guide-page.html',
  styleUrl: './guide-page.scss',
  encapsulation: ViewEncapsulation.None,
})
export class GuidePage implements AfterViewInit {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly guide = computed(() => this.guideForRoute());

  constructor() {
    afterEveryRender(() => this.applyLazyLoading());
    effect(() => {
      const guide = this.guide();
      this.seo.apply({
        title: guide.title,
        description: guide.description,
        path: guideRoutePath(guide.slug),
        openGraphType: 'article',
        structuredData: this.structuredData(guide),
      });
    });
  }

  ngAfterViewInit(): void {
    this.applyLazyLoading();
  }

  private applyLazyLoading(): void {
    // Angular sanitizes innerHTML without retaining loading. Apply the fixed
    // lazy value only to explicitly marked, build-sanitized guide images.
    // Initial view setup covers prerendering; the render hook covers navigation.
    for (const image of this.element.nativeElement.querySelectorAll(
      'img.guide-lazy-image:not([loading])',
    )) {
      this.renderer.setAttribute(image, 'loading', 'lazy');
    }
  }

  private guideForRoute(): Guide {
    const slug = this.params().get('guideSlug');
    if (slug && slug in guideBySlug) {
      return guideBySlug[slug];
    }
    throw new Error('A guide route must resolve to a known guide.');
  }

  private structuredData(guide: Guide): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: guide.heading,
          description: guide.description,
          datePublished: guide.publishDate,
          ...(guide.updatedDate ? { dateModified: guide.updatedDate } : {}),
        },
        ...(guide.faqs.length
          ? [
              {
                '@type': 'FAQPage',
                mainEntity: guide.faqs.map((faq) => ({
                  '@type': 'Question',
                  name: faq.question,
                  acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                })),
              },
            ]
          : []),
      ],
    };
  }
}
