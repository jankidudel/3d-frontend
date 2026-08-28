import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { Guide, GuideKey, guides } from './guide-content';

@Component({
  selector: 'app-guide-page',
  templateUrl: './guide-page.html',
  styleUrl: './guide-page.scss',
})
export class GuidePage {
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  protected readonly guide: Guide = guides[this.guideKey()];

  constructor() {
    this.seo.apply(this.guide);
  }

  private guideKey(): GuideKey {
    const key = this.route.snapshot.data['guide'];
    if (typeof key === 'string' && key in guides) {
      return key as GuideKey;
    }
    return 'non-manifold';
  }
}
