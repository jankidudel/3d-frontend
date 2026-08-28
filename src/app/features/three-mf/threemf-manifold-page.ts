import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StlJobProgress } from '../../core/components/stl-job-progress/stl-job-progress';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { ThreeMfFilePicker } from './threemf-file-picker';
import { ThreeMfQualityPage } from './threemf-quality-page';

@Component({
  selector: 'app-three-mf-manifold-page',
  imports: [RouterLink, ThreeMfFilePicker, StlJobProgress],
  templateUrl: './threemf-manifold-page.html',
  styleUrl: '../stl-manifold/stl-manifold-page.scss',
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
  readonly closedAndManifold = computed(
    () => this.openEdges() === 0 && this.nonManifoldEdges() === 0,
  );

  constructor() {
    super();
    this.manifoldSeo.apply({
      title: '3MF Manifold Checker - Check 3MF Mesh Topology | InspectMesh',
      description:
        'Check 3MF mesh topology for open edges, non-manifold edges and separate shells before slicing. See whether the resolved build geometry is closed and manifold.',
      path: PublicRouteUrl.ThreeMfManifoldChecker,
    });
  }

  private topologyCount(name: string): number | null {
    const topology = this.report()?.['topology'];
    const count =
      typeof topology === 'object' && topology !== null
        ? (topology as Record<string, unknown>)[name]
        : null;
    return typeof count === 'number' && Number.isFinite(count) ? count : null;
  }
}
