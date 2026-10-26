import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { ThreeMfFilePicker } from './threemf-file-picker';
import { ThreeMfQualityPage } from './threemf-quality-page';

@Component({
  selector: 'app-three-mf-manifold-page',
  imports: [RouterLink, ThreeMfFilePicker, JobProgress],
  templateUrl: './threemf-manifold-page.html',
  styleUrl: '../shared/model-checker-page.scss',
})
export class ThreeMfManifoldPage extends ThreeMfQualityPage {
  private readonly manifoldSeo = inject(SeoService);
  readonly openEdges = computed(() => this.topologyCount('openEdgeCount'));
  readonly nonManifoldEdges = computed(() =>
    this.topologyCount('nonManifoldEdgeCount'),
  );
  readonly shellCount = computed(() =>
    this.topologyCount('connectedComponentCount'),
  );
  readonly hasOrientationIssues = computed(() => {
    const topology = this.report()?.['topology'];
    return typeof topology === 'object' && topology !== null
      ? (topology as Record<string, unknown>)['hasInconsistentOrientation'] ===
          true
      : false;
  });
  readonly noEdgeFindings = computed(
    () => this.openEdges() === 0 && this.nonManifoldEdges() === 0,
  );

  constructor() {
    super();
    this.manifoldSeo.apply({
      title: '3MF Manifold Checker: Edge Sharing | InspectMesh',
      description:
        'Check supported 3MF edge relationships and interpret topology findings without treating clean counts as a complete solid-validity test.',
      path: PublicRouteUrl.ThreeMfManifoldChecker,
    });
  }

  private topologyCount(name: string): number | null {
    const topology = this.report()?.['topology'];
    const count =
      typeof topology === 'object' && topology !== null
        ? (topology as Record<string, unknown>)[name]
        : null;
    return typeof count === 'number' && Number.isInteger(count) && count >= 0
      ? count
      : null;
  }
}
