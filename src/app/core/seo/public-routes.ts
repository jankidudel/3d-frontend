export const PageType = {
  Home: 'home',
  Tool: 'tool',
  Guide: 'guide',
  Legal: 'legal',
  Contact: 'contact',
  NotFound: 'not-found',
} as const;

export type PageType = (typeof PageType)[keyof typeof PageType];

type PublicRouteDefinition<Path extends string = string> = Readonly<{
  path: Path;
  pageType: PageType;
}>;

const defineRoute = <Path extends string>(
  path: Path,
  pageType: PageType,
): PublicRouteDefinition<Path> => ({ path, pageType });

const toolRoute = <Path extends string>(path: Path) =>
  defineRoute(path, PageType.Tool);

const guideRoute = <Path extends string>(path: Path) =>
  defineRoute(path, PageType.Guide);

export const PublicRoutePath = {
  Home: defineRoute('', PageType.Home),
  AllTools: toolRoute('tools'),
  PrintCostCalculator: toolRoute('3d-print-cost-calculator'),
  ToleranceCalculator: toolRoute('3d-print-tolerance-calculator'),
  GcodePreflightChecker: toolRoute('gcode-preflight-checker'),
  OrientationPlanner: toolRoute('3d-print-orientation-planner'),
  Tools: toolRoute('stl-tools'),
  QualityCheck: toolRoute('stl-quality-checker'),
  StlPrintPreflight: toolRoute('stl-print-preflight'),
  StlRepair: toolRoute('stl-repair'),
  StlSplitter: toolRoute('stl-splitter'),
  ManifoldChecker: toolRoute('stl-manifold-checker'),
  WatertightChecker: toolRoute('stl-watertight-checker'),
  DimensionsChecker: toolRoute('stl-dimensions-checker'),
  StlScaleTool: toolRoute('stl-scale-tool'),
  StlWallThicknessChecker: toolRoute('stl-wall-thickness-checker'),
  StlOverhangChecker: toolRoute('stl-overhang-checker'),
  ThreeMfWallThicknessChecker: toolRoute('3mf-wall-thickness-checker'),
  ThreeMfOverhangChecker: toolRoute('3mf-overhang-checker'),
  TriangleCounter: toolRoute('stl-triangle-counter'),
  StlFileSizeReducer: toolRoute('stl-file-size-reducer'),
  VolumeCalculator: toolRoute('stl-volume-calculator'),
  Viewer: toolRoute('stl-viewer'),
  StlToThreeMfConverter: toolRoute('stl-to-3mf-converter'),
  ThreeMfTools: toolRoute('3mf-tools'),
  ThreeMfViewer: toolRoute('3mf-viewer'),
  ThreeMfQualityCheck: toolRoute('3mf-quality-checker'),
  ThreeMfPrintPreflight: toolRoute('3mf-print-preflight'),
  ThreeMfRepair: toolRoute('3mf-repair'),
  ThreeMfDimensionsChecker: toolRoute('3mf-dimensions-checker'),
  ThreeMfWatertightChecker: toolRoute('3mf-watertight-checker'),
  ThreeMfManifoldChecker: toolRoute('3mf-manifold-checker'),
  ThreeMfTriangleCounter: toolRoute('3mf-triangle-counter'),
  ThreeMfVolumeCalculator: toolRoute('3mf-volume-calculator'),
  ThreeMfToStlConverter: toolRoute('3mf-to-stl-converter'),
  Guides: guideRoute('guides'),
  Contact: defineRoute('contact', PageType.Contact),
  RotateModelToFitPrinterGuide: guideRoute(
    'how-to-rotate-a-3d-model-to-fit-your-printer',
  ),
  FixNonManifoldStlGuide: guideRoute('how-to-fix-non-manifold-stl'),
  WatertightStlGuide: guideRoute('how-to-tell-if-an-stl-is-watertight'),
  StlUnitsGuide: guideRoute('why-stl-files-have-no-units'),
  StlTriangleCountGuide: guideRoute('stl-triangle-count-explained'),
  StlToThreeMfGuide: guideRoute('how-to-convert-stl-to-3mf'),
  ToleranceAndClearanceGuide: guideRoute(
    '3d-print-tolerance-and-clearance-guide',
  ),
  ThreeMfToStlGuide: guideRoute('how-to-convert-3mf-to-stl'),
  Privacy: defineRoute('privacy', PageType.Legal),
  Cookies: defineRoute('cookies', PageType.Legal),
  NotFound: defineRoute('404', PageType.NotFound),
} as const;

type PublicRoutePathValues = {
  readonly [
    Key in keyof typeof PublicRoutePath
  ]: (typeof PublicRoutePath)[Key]['path'];
};

export const PublicRoutePathValue = Object.fromEntries(
  Object.entries(PublicRoutePath).map(([key, route]) => [key, route.path]),
) as PublicRoutePathValues;

type PublicRouteUrls = {
  readonly [
    Key in keyof typeof PublicRoutePath
  ]: `/${(typeof PublicRoutePath)[Key]['path']}`;
};

export const PublicRouteUrl = Object.fromEntries(
  Object.entries(PublicRoutePath).map(([key, route]) => [
    key,
    `/${route.path}`,
  ]),
) as PublicRouteUrls;

const publicRoutesByUrl = new Map(
  Object.values(PublicRoutePath).map((route) => [`/${route.path}`, route]),
);

export function getPublicRouteForUrl(
  url: string,
): PublicRouteDefinition | undefined {
  const pathname = url.split(/[?#]/, 1)[0] ?? '';
  return publicRoutesByUrl.get(pathname);
}

export const canonicalPublicRoutePaths = [
  PublicRoutePath.Home.path,
  PublicRoutePath.AllTools.path,
  PublicRoutePath.PrintCostCalculator.path,
  PublicRoutePath.ToleranceCalculator.path,
  PublicRoutePath.GcodePreflightChecker.path,
  PublicRoutePath.OrientationPlanner.path,
  PublicRoutePath.Tools.path,
  PublicRoutePath.QualityCheck.path,
  PublicRoutePath.StlPrintPreflight.path,
  PublicRoutePath.StlRepair.path,
  PublicRoutePath.StlSplitter.path,
  PublicRoutePath.ManifoldChecker.path,
  PublicRoutePath.WatertightChecker.path,
  PublicRoutePath.DimensionsChecker.path,
  PublicRoutePath.StlScaleTool.path,
  PublicRoutePath.StlWallThicknessChecker.path,
  PublicRoutePath.StlOverhangChecker.path,
  PublicRoutePath.ThreeMfWallThicknessChecker.path,
  PublicRoutePath.ThreeMfOverhangChecker.path,
  PublicRoutePath.TriangleCounter.path,
  PublicRoutePath.StlFileSizeReducer.path,
  PublicRoutePath.VolumeCalculator.path,
  PublicRoutePath.Viewer.path,
  PublicRoutePath.StlToThreeMfConverter.path,
  PublicRoutePath.ThreeMfTools.path,
  PublicRoutePath.ThreeMfViewer.path,
  PublicRoutePath.ThreeMfQualityCheck.path,
  PublicRoutePath.ThreeMfPrintPreflight.path,
  PublicRoutePath.ThreeMfRepair.path,
  PublicRoutePath.ThreeMfDimensionsChecker.path,
  PublicRoutePath.ThreeMfWatertightChecker.path,
  PublicRoutePath.ThreeMfManifoldChecker.path,
  PublicRoutePath.ThreeMfTriangleCounter.path,
  PublicRoutePath.ThreeMfVolumeCalculator.path,
  PublicRoutePath.ThreeMfToStlConverter.path,
  PublicRoutePath.Guides.path,
  PublicRoutePath.Contact.path,
] as const;
