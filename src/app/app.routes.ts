import { Routes } from '@angular/router';
import { BreadcrumbPageLayout } from './core/components/breadcrumb-page-layout/breadcrumb-page-layout';
import { PublicRoutePathValue as PublicRoutePath } from './core/seo/public-routes';
import { guideCanMatch } from './features/guides/guide-route';

const breadcrumbRoutes: Routes = [
  {
    path: PublicRoutePath.PrintCostCalculator,
    loadComponent: () =>
      import('./features/print-cost/print-cost-page').then(
        (m) => m.PrintCostPage,
      ),
  },
  {
    path: PublicRoutePath.FilamentLengthCalculator,
    loadComponent: () =>
      import('./features/filament-length-calculator/filament-length-calculator-page').then(
        (m) => m.FilamentLengthCalculatorPage,
      ),
  },
  {
    path: PublicRoutePath.ToleranceCalculator,
    loadComponent: () =>
      import('./features/tolerance-calculator/tolerance-calculator-page').then(
        (m) => m.ToleranceCalculatorPage,
      ),
  },
  {
    path: PublicRoutePath.FlowRateCalculator,
    loadComponent: () =>
      import('./features/flow-rate-calculator/flow-rate-calculator-page').then(
        (m) => m.FlowRateCalculatorPage,
      ),
  },
  {
    path: PublicRoutePath.ShrinkageCalculator,
    loadComponent: () =>
      import('./features/shrinkage-calculator/shrinkage-calculator-page').then(
        (m) => m.ShrinkageCalculatorPage,
      ),
  },
  {
    path: PublicRoutePath.GcodePreflightChecker,
    loadComponent: () =>
      import('./features/gcode-preflight/gcode-preflight-page').then(
        (m) => m.GcodePreflightPage,
      ),
  },
  {
    path: PublicRoutePath.OrientationPlanner,
    loadComponent: () =>
      import('./features/orientation-planner/orientation-planner-page').then(
        (m) => m.OrientationPlannerPage,
      ),
  },
  {
    path: PublicRoutePath.BedLayoutPlanner,
    loadComponent: () =>
      import('./features/bed-layout-planner/bed-layout-planner-page').then(
        (m) => m.BedLayoutPlannerPage,
      ),
  },
  {
    path: PublicRoutePath.Tools,
    loadComponent: () =>
      import('./features/stl-tools/stl-tools-page').then((m) => m.StlToolsPage),
  },
  {
    path: PublicRoutePath.QualityCheck,
    loadComponent: () =>
      import('./features/stl-quality/stl-quality-page/stl-quality-page').then(
        (m) => m.StlQualityPage,
      ),
  },
  {
    path: PublicRoutePath.StlPrintPreflight,
    loadComponent: () =>
      import('./features/stl-print-preflight/stl-print-preflight-page').then(
        (m) => m.StlPrintPreflightPage,
      ),
  },
  {
    path: PublicRoutePath.StlRepair,
    loadComponent: () =>
      import('./features/stl-repair/stl-repair-page').then(
        (m) => m.StlRepairPage,
      ),
  },
  {
    path: PublicRoutePath.StlSplitter,
    loadComponent: () =>
      import('./features/stl-splitter/stl-splitter-page').then(
        (m) => m.StlSplitterPage,
      ),
  },
  {
    path: PublicRoutePath.ManifoldChecker,
    loadComponent: () =>
      import('./features/stl-manifold/stl-manifold-page').then(
        (m) => m.StlManifoldPage,
      ),
  },
  {
    path: PublicRoutePath.WatertightChecker,
    loadComponent: () =>
      import('./features/stl-watertight/stl-watertight-page').then(
        (m) => m.StlWatertightPage,
      ),
  },
  {
    path: PublicRoutePath.TriangleCounter,
    loadComponent: () =>
      import('./features/stl-triangle/stl-triangle-page').then(
        (m) => m.StlTrianglePage,
      ),
  },
  {
    path: PublicRoutePath.StlFileSizeReducer,
    loadComponent: () =>
      import('./features/stl-reducer/stl-reducer-page').then(
        (m) => m.StlReducerPage,
      ),
  },
  {
    path: PublicRoutePath.DimensionsChecker,
    loadComponent: () =>
      import('./features/stl-dimensions/stl-dimensions-page').then(
        (m) => m.StlDimensionsPage,
      ),
  },
  {
    path: PublicRoutePath.StlScaleTool,
    loadComponent: () =>
      import('./features/stl-scale/stl-scale-page').then((m) => m.StlScalePage),
  },
  {
    path: PublicRoutePath.StlWallThicknessChecker,
    loadComponent: () =>
      import('./features/stl-wall-thickness/stl-wall-thickness-page').then(
        (m) => m.StlWallThicknessPage,
      ),
  },
  {
    path: PublicRoutePath.StlOverhangChecker,
    loadComponent: () =>
      import('./features/overhang/stl-overhang-page').then(
        (m) => m.StlOverhangPage,
      ),
  },
  {
    path: PublicRoutePath.VolumeCalculator,
    loadComponent: () =>
      import('./features/stl-volume/stl-volume-page').then(
        (m) => m.StlVolumePage,
      ),
  },
  {
    path: PublicRoutePath.Viewer,
    loadComponent: () =>
      import('./features/stl-viewer/stl-viewer-page').then(
        (m) => m.StlViewerPage,
      ),
  },
  {
    path: PublicRoutePath.StlToThreeMfConverter,
    loadComponent: () =>
      import('./features/converters/local-converter-page').then(
        (m) => m.StlToThreeMfConverterPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfTools,
    loadComponent: () =>
      import('./features/three-mf/threemf-tools-page').then(
        (m) => m.ThreeMfToolsPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfViewer,
    loadComponent: () =>
      import('./features/three-mf/threemf-viewer-page').then(
        (m) => m.ThreeMfViewerPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfQualityCheck,
    loadComponent: () =>
      import('./features/three-mf/threemf-quality-page').then(
        (m) => m.ThreeMfQualityPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfPrintPreflight,
    loadComponent: () =>
      import('./features/three-mf-print-preflight/three-mf-print-preflight-page').then(
        (m) => m.ThreeMfPrintPreflightPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfRepair,
    loadComponent: () =>
      import('./features/three-mf/threemf-repair-page').then(
        (m) => m.ThreeMfRepairPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfDimensionsChecker,
    loadComponent: () =>
      import('./features/three-mf/threemf-dimensions-page').then(
        (m) => m.ThreeMfDimensionsPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfWallThicknessChecker,
    loadComponent: () =>
      import('./features/three-mf/threemf-wall-thickness-page').then(
        (m) => m.ThreeMfWallThicknessPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfOverhangChecker,
    loadComponent: () =>
      import('./features/overhang/three-mf-overhang-page').then(
        (m) => m.ThreeMfOverhangPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfWatertightChecker,
    loadComponent: () =>
      import('./features/three-mf/threemf-watertight-page').then(
        (m) => m.ThreeMfWatertightPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfManifoldChecker,
    loadComponent: () =>
      import('./features/three-mf/threemf-manifold-page').then(
        (m) => m.ThreeMfManifoldPage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfTriangleCounter,
    loadComponent: () =>
      import('./features/three-mf/threemf-triangle-page').then(
        (m) => m.ThreeMfTrianglePage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfVolumeCalculator,
    loadComponent: () =>
      import('./features/three-mf/threemf-volume-page').then(
        (m) => m.ThreeMfVolumePage,
      ),
  },
  {
    path: PublicRoutePath.ThreeMfToStlConverter,
    loadComponent: () =>
      import('./features/converters/local-converter-page').then(
        (m) => m.ThreeMfToStlConverterPage,
      ),
  },
  {
    path: ':guideSlug',
    canMatch: [guideCanMatch],
    loadComponent: () =>
      import('./features/guides/guide-page').then((m) => m.GuidePage),
  },
];

export const routes: Routes = [
  {
    path: PublicRoutePath.AllTools,
    loadComponent: () =>
      import('./features/tools/tools-page').then((m) => m.ToolsPage),
  },
  {
    path: PublicRoutePath.Home,
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: PublicRoutePath.Guides,
    loadComponent: () =>
      import('./features/guides/guides-page').then((m) => m.GuidesPage),
  },
  {
    path: PublicRoutePath.Privacy,
    loadComponent: () =>
      import('./features/legal/privacy-page').then((m) => m.PrivacyPage),
  },
  {
    path: PublicRoutePath.Cookies,
    loadComponent: () =>
      import('./features/legal/cookies-page').then((m) => m.CookiesPage),
  },
  {
    path: PublicRoutePath.Contact,
    loadComponent: () =>
      import('./features/contact/contact-page').then((m) => m.ContactPage),
  },
  {
    path: '',
    component: BreadcrumbPageLayout,
    children: breadcrumbRoutes,
  },
  {
    path: PublicRoutePath.NotFound,
    loadComponent: () =>
      import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
