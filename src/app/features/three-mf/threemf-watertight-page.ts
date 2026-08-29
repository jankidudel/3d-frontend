import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { ThreeMfQualityPage } from './threemf-quality-page';
import { ThreeMfFilePicker } from './threemf-file-picker';

@Component({
  selector: 'app-three-mf-watertight-page',
  imports: [RouterLink, ThreeMfFilePicker, JobProgress],
  templateUrl: './threemf-watertight-page.html',
  styleUrl: '../shared/model-checker-page.scss',
})
export class ThreeMfWatertightPage extends ThreeMfQualityPage {
  private readonly watertightSeo = inject(SeoService);
  readonly openEdges = computed(() => {
    const topology = this.report()?.['topology'];
    if (typeof topology !== 'object' || topology === null) {
      return null;
    }
    const count = (topology as Record<string, unknown>)['openEdgeCount'];
    return typeof count === 'number' && Number.isFinite(count) ? count : null;
  });
  readonly shellCount = computed(() => {
    const topology = this.report()?.['topology'];
    const count =
      typeof topology === 'object' && topology !== null
        ? (topology as Record<string, unknown>)['connectedComponentCount']
        : null;
    return typeof count === 'number' && Number.isFinite(count) ? count : null;
  });

  constructor() {
    super();
    this.watertightSeo.apply({
      title: '3MF Watertight Checker - Check 3MF Files Online | InspectMesh',
      description:
        'Check whether a 3MF file has open edges or a closed watertight surface before slicing. Review build structure and continue to a full 3MF quality check.',
      path: PublicRouteUrl.ThreeMfWatertightChecker,
    });
  }
}
