export const PageType = {
  Home: 'home',
  Tool: 'tool',
  Guide: 'guide',
  Legal: 'legal',
  Contact: 'contact',
  NotFound: 'not-found',
} as const;

export type PageType = (typeof PageType)[keyof typeof PageType];

export const PublicRouteSegment = {
  Compare: 'compare',
  Printers: '3d-printers',
  Materials: '3d-printing-materials',
  MaterialComparisons: 'compare-materials',
} as const;

export const PrinterSlug = {
  BambuLabA1Mini: 'bambu-lab-a1-mini',
  BambuLabA1: 'bambu-lab-a1',
  BambuLabP1P: 'bambu-lab-p1p',
  BambuLabP1S: 'bambu-lab-p1s',
  BambuLabP2S: 'p2s',
  BambuLabX1Carbon: 'bambu-lab-x1-carbon',
  PrusaCoreOne: 'prusa-core-one',
  PrusaMk4S: 'prusa-mk4s',
  CrealityK1C: 'creality-k1c',
  ElegooNeptune4Plus: 'elegoo-neptune-4-plus',
  SovolSv06Ace: 'sovol-sv06-ace',
} as const;

export const PrinterComparisonSlug = {
  BambuLabP1SVsP2S: 'bambu-lab-p1s-vs-p2s',
  BambuLabA1VsP2S: 'bambu-lab-a1-vs-p2s',
  BambuLabA1VsA1Mini: 'bambu-lab-a1-vs-a1-mini',
  BambuLabP1SVsA1: 'bambu-lab-p1s-vs-a1',
  BambuLabP1PVsP1S: 'bambu-lab-p1p-vs-p1s',
  BambuLabX1CarbonVsP2S: 'bambu-lab-x1-carbon-vs-p2s',
  PrusaCoreOneVsBambuLabP1S: 'prusa-core-one-vs-bambu-lab-p1s',
  PrusaMk4SVsBambuLabA1: 'prusa-mk4s-vs-bambu-lab-a1',
  CrealityK1CVsBambuLabP1S: 'creality-k1c-vs-bambu-lab-p1s',
  ElegooNeptune4PlusVsBambuLabA1: 'elegoo-neptune-4-plus-vs-bambu-lab-a1',
} as const;

export const MaterialSlug = {
  Pla: 'pla',
  Petg: 'petg',
  Abs: 'abs',
  Asa: 'asa',
  Tpu: 'tpu',
  Nylon: 'nylon',
  Polycarbonate: 'polycarbonate',
  Polypropylene: 'polypropylene',
} as const;

export const MaterialComparisonSlug = {
  PlaVsPetg: 'pla-vs-petg',
  PlaVsAbs: 'pla-vs-abs',
  PetgVsAbs: 'petg-vs-abs',
  AbsVsAsa: 'abs-vs-asa',
  PetgVsAsa: 'petg-vs-asa',
  PlaVsTpu: 'pla-vs-tpu',
  PetgVsTpu: 'petg-vs-tpu',
  PetgVsNylon: 'petg-vs-nylon',
  NylonVsPolycarbonate: 'nylon-vs-polycarbonate',
  PolypropyleneVsPetg: 'polypropylene-vs-petg',
} as const;

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
  BatchStlChecker: toolRoute('batch-stl-checker'),
  StlCompare: toolRoute('stl-compare'),
  FilamentRemainingCalculator: toolRoute('filament-remaining-calculator'),
  NozzleLayerHeightCalculator: toolRoute('nozzle-layer-height-calculator'),
  VolumetricFlowCalculator: toolRoute('volumetric-flow-calculator'),
  PrintFinishTimeCalculator: toolRoute('3d-print-finish-time-calculator'),
  Compare3dPrinters: toolRoute('compare-3d-printers'),
  Compare: toolRoute(PublicRouteSegment.Compare),
  PrinterFitChecker: toolRoute('3d-printer-fit-checker'),
  Printers: toolRoute(PublicRouteSegment.Printers),
  Materials: toolRoute(PublicRouteSegment.Materials),
  MaterialSelector: toolRoute('3d-printing-material-selector'),
  CompareMaterials: toolRoute('compare-3d-printing-materials'),
  PrintCostCalculator: toolRoute('3d-print-cost-calculator'),
  PrintPriceCalculator: toolRoute('3d-printing-price-calculator'),
  FilamentLengthCalculator: toolRoute('filament-length-calculator'),
  ToleranceCalculator: toolRoute('3d-print-tolerance-calculator'),
  FlowRateCalculator: toolRoute('3d-print-flow-rate-calculator'),
  ShrinkageCalculator: toolRoute('3d-print-shrinkage-calculator'),
  GcodePreflightChecker: toolRoute('gcode-preflight-checker'),
  OrientationPlanner: toolRoute('3d-print-orientation-planner'),
  BedLayoutPlanner: toolRoute('3d-print-bed-layout-planner'),
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
  ShrinkageCompensationGuide: guideRoute(
    'how-to-compensate-for-3d-print-shrinkage',
  ),
  ThreeMfToStlGuide: guideRoute('how-to-convert-3mf-to-stl'),
  Privacy: defineRoute('privacy', PageType.Legal),
  Cookies: defineRoute('cookies', PageType.Legal),
  NotFound: defineRoute('404', PageType.NotFound),
} as const;

export const PrinterRoutePath = {
  BambuLabA1Mini: `${PublicRoutePath.Printers.path}/${PrinterSlug.BambuLabA1Mini}`,
  BambuLabA1: `${PublicRoutePath.Printers.path}/${PrinterSlug.BambuLabA1}`,
  BambuLabP1S: `${PublicRoutePath.Printers.path}/${PrinterSlug.BambuLabP1S}`,
  BambuLabP2S: `${PublicRoutePath.Printers.path}/${PrinterSlug.BambuLabP2S}`,
  BambuLabX1Carbon: `${PublicRoutePath.Printers.path}/${PrinterSlug.BambuLabX1Carbon}`,
  PrusaCoreOne: `${PublicRoutePath.Printers.path}/${PrinterSlug.PrusaCoreOne}`,
  PrusaMk4S: `${PublicRoutePath.Printers.path}/${PrinterSlug.PrusaMk4S}`,
  CrealityK1C: `${PublicRoutePath.Printers.path}/${PrinterSlug.CrealityK1C}`,
  ElegooNeptune4Plus: `${PublicRoutePath.Printers.path}/${PrinterSlug.ElegooNeptune4Plus}`,
  SovolSv06Ace: `${PublicRoutePath.Printers.path}/${PrinterSlug.SovolSv06Ace}`,
} as const;

export const PrinterComparisonRoutePath = Object.fromEntries(
  Object.entries(PrinterComparisonSlug).map(([key, slug]) => [
    key,
    `${PublicRoutePath.Compare.path}/${slug}`,
  ]),
) as {
  readonly [
    Key in keyof typeof PrinterComparisonSlug
  ]: `${typeof PublicRoutePath.Compare.path}/${(typeof PrinterComparisonSlug)[Key]}`;
};

export const MaterialRoutePath = Object.fromEntries(
  Object.entries(MaterialSlug).map(([key, slug]) => [
    key,
    `${PublicRoutePath.Materials.path}/${slug}`,
  ]),
) as {
  readonly [
    Key in keyof typeof MaterialSlug
  ]: `${typeof PublicRoutePath.Materials.path}/${(typeof MaterialSlug)[Key]}`;
};

export const MaterialComparisonRoutePath = Object.fromEntries(
  Object.entries(MaterialComparisonSlug).map(([key, slug]) => [
    key,
    `${PublicRouteSegment.MaterialComparisons}/${slug}`,
  ]),
) as {
  readonly [
    Key in keyof typeof MaterialComparisonSlug
  ]: `${typeof PublicRouteSegment.MaterialComparisons}/${(typeof MaterialComparisonSlug)[Key]}`;
};

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
  PublicRoutePath.BatchStlChecker.path,
  PublicRoutePath.StlCompare.path,
  PublicRoutePath.FilamentRemainingCalculator.path,
  PublicRoutePath.NozzleLayerHeightCalculator.path,
  PublicRoutePath.VolumetricFlowCalculator.path,
  PublicRoutePath.PrintFinishTimeCalculator.path,
  PublicRoutePath.Compare3dPrinters.path,
  PublicRoutePath.PrinterFitChecker.path,
  PublicRoutePath.Printers.path,
  PublicRoutePath.Materials.path,
  PublicRoutePath.MaterialSelector.path,
  PublicRoutePath.CompareMaterials.path,
  ...Object.values(MaterialRoutePath),
  ...Object.values(MaterialComparisonRoutePath),
  ...Object.values(PrinterComparisonRoutePath),
  ...Object.values(PrinterRoutePath),
  PublicRoutePath.PrintCostCalculator.path,
  PublicRoutePath.PrintPriceCalculator.path,
  PublicRoutePath.FilamentLengthCalculator.path,
  PublicRoutePath.ToleranceCalculator.path,
  PublicRoutePath.FlowRateCalculator.path,
  PublicRoutePath.ShrinkageCalculator.path,
  PublicRoutePath.GcodePreflightChecker.path,
  PublicRoutePath.OrientationPlanner.path,
  PublicRoutePath.BedLayoutPlanner.path,
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
