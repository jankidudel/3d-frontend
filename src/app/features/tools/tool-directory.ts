import { PublicRouteUrl } from '../../core/seo/public-routes';
import { HOME_TOOL_GROUPS, type HomeTool } from '../home/home-tools';

const extraTools: readonly HomeTool[] = [
  {
    route: PublicRouteUrl.MaterialSelector,
    title: '3D Printing Material Selector',
    description:
      'Compare part requirements and exact formulation evidence before selecting a material.',
    cta: 'Choose a material',
    icon: '◇',
  },
  {
    route: PublicRouteUrl.CompareMaterials,
    title: 'Material Comparison',
    description:
      'Compare two filament families and review their evidence limits.',
    cta: 'Compare materials',
    icon: '◇',
  },
  {
    route: PublicRouteUrl.Compare3dPrinters,
    title: '3D Printer Comparison',
    description:
      'Compare printer requirements before choosing equipment for a job.',
    cta: 'Compare printers',
    icon: '◇',
  },
  {
    route: PublicRouteUrl.FlowRateCalculator,
    title: 'Flow Rate Calculator',
    description:
      'Calculate an extrusion multiplier adjustment from a measured calibration wall.',
    cta: 'Review flow calibration',
    icon: '◇',
  },
  {
    route: PublicRouteUrl.QuoteGenerator,
    title: '3D Printing Quote Generator',
    description:
      'Prepare a customer document from reviewed pricing and an agreed specification.',
    cta: 'Prepare a quotation',
    icon: '◇',
  },
];
const inventory = [
  ...HOME_TOOL_GROUPS.flatMap((group) => group.tools),
  ...extraTools,
];
const definitions = [
  {
    id: 'open-inspect',
    title: 'Open and inspect',
    intro: 'See the model or placed build before changing it.',
    routes: [
      PublicRouteUrl.Viewer,
      PublicRouteUrl.ThreeMfViewer,
      PublicRouteUrl.DimensionsChecker,
      PublicRouteUrl.ThreeMfDimensionsChecker,
      PublicRouteUrl.TriangleCounter,
      PublicRouteUrl.ThreeMfTriangleCounter,
      PublicRouteUrl.VolumeCalculator,
      PublicRouteUrl.ThreeMfVolumeCalculator,
    ],
  },
  {
    id: 'diagnose',
    title: 'Diagnose a finding',
    intro:
      'Start broad, then inspect the specific finding. A checker does not establish design intent.',
    routes: [
      PublicRouteUrl.QualityCheck,
      PublicRouteUrl.ThreeMfQualityCheck,
      PublicRouteUrl.StlPrintPreflight,
      PublicRouteUrl.ThreeMfPrintPreflight,
      PublicRouteUrl.ManifoldChecker,
      PublicRouteUrl.ThreeMfManifoldChecker,
      PublicRouteUrl.WatertightChecker,
      PublicRouteUrl.ThreeMfWatertightChecker,
      PublicRouteUrl.StlWallThicknessChecker,
      PublicRouteUrl.ThreeMfWallThicknessChecker,
      PublicRouteUrl.StlOverhangChecker,
      PublicRouteUrl.ThreeMfOverhangChecker,
      PublicRouteUrl.BatchStlChecker,
    ],
  },
  {
    id: 'change-verify',
    title: 'Change and verify',
    intro:
      'Keep the original, make the intended edit, and check the exported copy.',
    routes: [
      PublicRouteUrl.StlRepair,
      PublicRouteUrl.ThreeMfRepair,
      PublicRouteUrl.StlScaleTool,
      PublicRouteUrl.StlSplitter,
      PublicRouteUrl.StlFileSizeReducer,
      PublicRouteUrl.StlCompare,
      PublicRouteUrl.StlToThreeMfConverter,
      PublicRouteUrl.ThreeMfToStlConverter,
    ],
  },
  {
    id: 'fit-orient',
    title: 'Fit and orient',
    intro:
      'Compare model bounds and candidate placement, then confirm the actual layers in your slicer.',
    routes: [
      PublicRouteUrl.PrinterFitChecker,
      PublicRouteUrl.OrientationPlanner,
      PublicRouteUrl.BedLayoutPlanner,
      PublicRouteUrl.ToleranceCalculator,
      PublicRouteUrl.ShrinkageCalculator,
      PublicRouteUrl.Compare3dPrinters,
    ],
  },
  {
    id: 'material-job',
    title: 'Material and sliced job',
    intro:
      'Use complete sliced consumption for a job; solid geometry is a different estimate.',
    routes: [
      PublicRouteUrl.MaterialSelector,
      PublicRouteUrl.CompareMaterials,
      PublicRouteUrl.FilamentLengthCalculator,
      PublicRouteUrl.FilamentRemainingCalculator,
      PublicRouteUrl.NozzleLayerHeightCalculator,
      PublicRouteUrl.VolumetricFlowCalculator,
      PublicRouteUrl.FlowRateCalculator,
      PublicRouteUrl.GcodePreflightChecker,
      PublicRouteUrl.PrintFinishTimeCalculator,
    ],
  },
  {
    id: 'cost-quote',
    title: 'Cost and quote',
    intro:
      'Separate production inputs, selling-price assumptions and the customer document.',
    routes: [
      PublicRouteUrl.PrintCostCalculator,
      PublicRouteUrl.PrintPriceCalculator,
      PublicRouteUrl.QuoteGenerator,
    ],
  },
];
export const toolDirectoryGroups = definitions.map((group) => ({
  ...group,
  tools: group.routes.map((route) => {
    const tool = inventory.find((entry) => entry.route === route);
    if (!tool) {
      throw new Error('Missing tool directory entry: ' + route);
    }
    return tool;
  }),
}));
