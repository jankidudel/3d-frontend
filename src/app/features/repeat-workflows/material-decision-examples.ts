import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { MaterialId } from '../materials/material-catalogue';
export const materialDecisionExamples = {
  [MaterialId.Pla]: {
    heading: 'Indoor fit before sustained service',
    example:
      'For an illustrative desk cable holder, an unloaded fit at recorded room conditions can locate rigid features. It does not show whether the 30 mm arm holds its position under cable weight over time. Warm exposure adds a thermal evidence question; the historical PLA sheet cannot turn an attractive prototype into an approved service part.',
    next: 'Record actual part temperature, load arrangement, duration and allowable movement before extending the prototype. Compare immediate loaded deflection with later observations at the same references. A representative orientation and root geometry are needed; initial stiffness is not long-term shape retention.',
    guide: GuideRouteUrl.Route3dPrintCreepUnderSustainedLoad,
    guideLabel: 'Separate immediate deflection from the time record',
  },
  [MaterialId.Petg]: {
    heading: 'Handling toughness and holder shape retention',
    example:
      'For an illustrative PETG cable holder or mount, surviving repeated handling answers a different question from retaining its position beside warm equipment. The existing support-removal and surface-release checks remain relevant, but neither toughness nor a clean cooled fit establishes sustained-load performance.',
    next: 'Before extending the job to warm service, record temperature at the loaded part, the cable/support load path, required duration and acceptable movement. If those are missing, keep service performance unresolved. Follow the exact spool drying and storage guidance when preparation is the issue.',
    guide: GuideRouteUrl.Route3dPrintCreepUnderSustainedLoad,
    guideLabel: 'Investigate deformation under persistent loading',
  },
  [MaterialId.Abs]: {
    heading: 'A warm housing needs more than a successful print',
    example:
      'For an illustrative PolyLite ABS electronics housing, printing the corner without lift establishes a process observation. Its chamber and nozzle instructions concern preparation; a thermal-test result concerns its stated test condition. Neither establishes retention around a warm, loaded screw boss for the required service duration.',
    next: 'Keep cooled mounting dimensions separate from operating-temperature observations. Record contact temperature, fastening constraint and duration, then request applicable thermal method/load and part-level evidence. Verify the documented chamber, profile and surface before repeating the corner trial.',
    guide: GuideRouteUrl.Route3dPrintHeatResistanceHdtVsTg,
    guideLabel: 'Read thermal metrics with method and load',
  },
  [MaterialId.Asa]: {
    heading: 'An exposed cover and its heated mounts',
    example:
      'For an illustrative outdoor ASA sensor cover, the published UV statement can support investigating exposure resistance. It does not establish colour lifetime, sealing at the cable opening, mount shape under heat or moisture-conditioned fit. The cover and each fastening feature have different observations to retain.',
    next: 'Record the actual part temperature, attachment load and exposure duration alongside sunlight and water paths. Measure the mount in a stated condition before and after representative exposure; initial insertion and weathering language cannot accept loaded thermal service.',
    guide: GuideRouteUrl.Route3dPrintHeatResistanceHdtVsTg,
    guideLabel: 'Separate exposure statements from loaded thermal evidence',
  },
  [MaterialId.Tpu]: {
    heading: 'Compliant contact and holding-force retention',
    example:
      'For an illustrative TPU grip or clamped bumper, the selected Shore scale helps identify hardness. A successful insertion or immediate rebound does not establish the force retained while the feature stays compressed. A part can keep its visible position while holding force changes.',
    next: 'Define whether deformation or applied force is constrained, then record force or displacement as appropriate, temperature, duration and recovery times. No compression-set value or relaxation curve is supplied by the hardness result. Keep feed-path and exact-grade profile preparation with the trial.',
    guide: GuideRouteUrl.Route3dPrintCreepUnderSustainedLoad,
    guideLabel: 'Distinguish relaxation from creep and recovery',
  },
  [MaterialId.Nylon]: {
    heading: 'Unfilled PA11 fit after service exposure',
    example:
      "For an illustrative long-job mating feature, retain the actual unfilled Prusament PA11 identity. Spool drying, protected feeding, cooled reference fit and finished-part service exposure are separate states. A result for PA6, PA12 or PA11 Carbon Fiber cannot supply this grade's missing dry-versus-conditioned mechanical data.",
    next: 'Keep spool preparation dates and feed conditions, then record each finished-part measurement state, temperature, exposure duration and counterpart condition. Compare the same references and axes; do not convert a mass-uptake percentage into a dimensional scale factor.',
    guide: GuideRouteUrl.Route3dPrintMoistureAndDimensionalStability,
    guideLabel: 'Compare fit readings in identified material states',
  },
  [MaterialId.Pc]: {
    heading: 'PC Blend test loads are separate observations',
    example:
      "For an illustrative heat-exposed guard, Prusament PC Blend version 1.1 reports HDT of 93 °C at 1.80 MPa and 113 °C at 0.45 MPa. The higher result belongs to the lower test stress. Neither is a continuous service limit, and the difference supplies no interpolation for the guard's loading.",
    next: 'Preserve both loads and the exact blend identity. Verify the full printer profile and surface preparation, then record actual guard temperature, constraints and duration. A small successful fit sample and a large footprint need separate warp observations; loaded service needs applicable evidence.',
    guide: GuideRouteUrl.Route3dPrintHeatResistanceHdtVsTg,
    guideLabel: 'Interpret the same-grade HDT load contrast',
  },
  [MaterialId.Pp]: {
    heading: 'Repeated bending versus a lid held deflected',
    example:
      'For an illustrative container lid, repeated hinge cycles and a clip held in a deflected position ask different questions. The named Prusament PP Carbon Fiber density example is a filled formulation, not evidence for an unfilled living-hinge grade. Low mass does not resolve either time-dependent behaviour or adhesion.',
    next: "For repeated flexing, define bend geometry, orientation and cycle requirement. For a held clip, define deformation, force retention, temperature and elapsed time separately. Verify the chosen grade's surface and nozzle requirements; no generic hinge lifetime or creep rating follows.",
    guide: GuideRouteUrl.Route3dPrintCreepUnderSustainedLoad,
    guideLabel: 'Separate sustained retention from repeated-cycle evidence',
  },
};
