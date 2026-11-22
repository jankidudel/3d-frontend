import { PublicRouteUrl } from './public-routes';
import { publisherNode } from './site-identity';

/** schema.org applicationCategory values used by InspectMesh tools. */
export const ApplicationCategory = {
  Utilities: 'UtilitiesApplication',
  Business: 'BusinessApplication',
} as const;
export type ApplicationCategory =
  (typeof ApplicationCategory)[keyof typeof ApplicationCategory];

/** Every tool runs in a web browser rather than a specific operating system. */
const BROWSER_OPERATING_SYSTEM = 'Any';

export interface WebApplicationEntry {
  /** Must equal the page's visible H1; the HTML audit enforces this. */
  readonly name: string;
  readonly category: ApplicationCategory;
}

const utility = (name: string): WebApplicationEntry => ({
  name,
  category: ApplicationCategory.Utilities,
});
const business = (name: string): WebApplicationEntry => ({
  name,
  category: ApplicationCategory.Business,
});

/**
 * Tool pages that perform a task in the browser. Hubs and catalogues are not
 * applications and are deliberately absent.
 */
export const WEB_APPLICATIONS: Readonly<Record<string, WebApplicationEntry>> = {
  [PublicRouteUrl.BedLayoutPlanner]: utility('3D Print Bed Layout Planner'),
  [PublicRouteUrl.PrintCostCalculator]: business('3D Print Cost Calculator'),
  [PublicRouteUrl.PrintFinishTimeCalculator]: utility(
    '3D Print Finish Time Calculator',
  ),
  [PublicRouteUrl.FlowRateCalculator]: utility('3D Print Flow Rate Calculator'),
  [PublicRouteUrl.OrientationPlanner]: utility('3D Print Orientation Planner'),
  [PublicRouteUrl.ShrinkageCalculator]: utility(
    '3D Print Shrinkage Calculator',
  ),
  [PublicRouteUrl.ToleranceCalculator]: utility(
    '3D Print Tolerance & Clearance Calculator',
  ),
  [PublicRouteUrl.PrinterFitChecker]: utility('3D Printer Fit Checker'),
  [PublicRouteUrl.MaterialSelector]: utility('3D Printing Material Selector'),
  [PublicRouteUrl.PrintPriceCalculator]: business(
    '3D Printing Price Calculator',
  ),
  [PublicRouteUrl.QuoteGenerator]: business('3D Printing Quote Generator'),
  [PublicRouteUrl.ThreeMfDimensionsChecker]: utility('3MF Dimensions Checker'),
  [PublicRouteUrl.ThreeMfManifoldChecker]: utility('3MF Manifold Checker'),
  [PublicRouteUrl.ThreeMfOverhangChecker]: utility('3MF Overhang Checker'),
  [PublicRouteUrl.ThreeMfPrintPreflight]: utility(
    '3MF Print Preflight Checker',
  ),
  [PublicRouteUrl.ThreeMfQualityCheck]: utility('3MF Quality Checker'),
  [PublicRouteUrl.ThreeMfRepair]: utility('Repair a 3MF File'),
  [PublicRouteUrl.ThreeMfToStlConverter]: utility('3MF to STL Converter'),
  [PublicRouteUrl.ThreeMfTriangleCounter]: utility('3MF Triangle Counter'),
  [PublicRouteUrl.ThreeMfViewer]: utility('Free 3MF Viewer Online'),
  [PublicRouteUrl.ThreeMfVolumeCalculator]: utility('3MF Volume Calculator'),
  [PublicRouteUrl.ThreeMfWallThicknessChecker]: utility(
    '3MF Wall Thickness Checker',
  ),
  [PublicRouteUrl.ThreeMfWatertightChecker]: utility('3MF Watertight Checker'),
  [PublicRouteUrl.BatchStlChecker]: utility('Batch STL and 3MF Checker'),
  [PublicRouteUrl.Compare3dPrinters]: utility('Compare 3D Printers'),
  [PublicRouteUrl.CompareMaterials]: utility('Compare 3D Printing Materials'),
  [PublicRouteUrl.FilamentLengthCalculator]: utility(
    'Filament Length Calculator',
  ),
  [PublicRouteUrl.FilamentRemainingCalculator]: utility(
    'Filament Remaining and Job Sufficiency Calculator',
  ),
  [PublicRouteUrl.GcodePreflightChecker]: utility('Free G-code Viewer'),
  [PublicRouteUrl.NozzleLayerHeightCalculator]: utility(
    'Nozzle, Layer Height and Wall Planner',
  ),
  [PublicRouteUrl.StlCompare]: utility('Compare Two STL Files'),
  [PublicRouteUrl.DimensionsChecker]: utility('STL Dimensions Checker'),
  [PublicRouteUrl.StlFileSizeReducer]: utility('STL File Size Reducer'),
  [PublicRouteUrl.ManifoldChecker]: utility(
    'STL Manifold Checker: Open and Over-Shared Edges',
  ),
  [PublicRouteUrl.StlOverhangChecker]: utility('STL Overhang Checker'),
  [PublicRouteUrl.StlPrintPreflight]: utility('STL Print Preflight Checker'),
  [PublicRouteUrl.QualityCheck]: utility('STL Quality Checker'),
  [PublicRouteUrl.StlRepair]: utility('STL Repair Tool'),
  [PublicRouteUrl.StlScaleTool]: utility('STL Scale Tool'),
  [PublicRouteUrl.StlSplitter]: utility('Split an STL File for 3D Printing'),
  [PublicRouteUrl.StlToThreeMfConverter]: utility('STL to 3MF Converter'),
  [PublicRouteUrl.TriangleCounter]: utility('STL Triangle Counter'),
  [PublicRouteUrl.Viewer]: utility('Free STL Viewer Online'),
  [PublicRouteUrl.VolumeCalculator]: utility('STL Volume Calculator'),
  [PublicRouteUrl.StlWallThicknessChecker]: utility(
    'STL Wall Thickness Checker',
  ),
  [PublicRouteUrl.WatertightChecker]: utility('STL Watertight Checker'),
  [PublicRouteUrl.VolumetricFlowCalculator]: utility(
    'Volumetric Flow and Print Speed Calculator',
  ),
};

/** WebApplication node for a tool page, or undefined for any other page. */
export function webApplicationNode(
  path: string,
  canonicalUrl: string,
  description: string,
): Record<string, unknown> | undefined {
  const entry = WEB_APPLICATIONS[path];
  if (!entry) {
    return undefined;
  }
  const origin = new URL(canonicalUrl).origin;
  return {
    '@type': 'WebApplication',
    name: entry.name,
    url: canonicalUrl,
    description,
    applicationCategory: entry.category,
    operatingSystem: BROWSER_OPERATING_SYSTEM,
    publisher: publisherNode(origin),
  };
}
