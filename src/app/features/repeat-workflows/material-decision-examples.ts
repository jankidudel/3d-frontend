import { MaterialId } from '../materials/material-catalogue';
export const materialDecisionExamples = {
  [MaterialId.Pla]: {
    heading: 'Indoor brackets and holders',
    example:
      'For an illustrative desk cable holder, compare stiffness, layer direction and the actual load before using a PLA prototype as a final functional part. A holder away from heat has a different task from a bracket beside a motor or in a sun-heated vehicle. An attractive surface is not evidence of long-term creep or impact performance.',
    next: 'Make a representative load/fit coupon with fillets and the same orientation as the intended part. Retain actual product data for the exact formulation. Use the selector to compare requirements and the cost/spool planners with sliced consumption; do not infer printed weight from solid CAD volume.',
  },
  [MaterialId.Petg]: {
    heading: 'Investigate moisture before buying a dryer',
    example:
      'Illustrative investigation: a stored PETG spool starts stringing. Record the exact product, prior temperature and retraction settings, then consult its manufacturer drying guidance. A dryer can address moisture; it cannot resolve every temperature, travel, contamination or geometry problem. Compare like-for-like sliced jobs before attributing the outcome to drying.',
    next: 'Use an appropriate drying cycle for the exact spool and filament, then suitable storage. The cited Prusa drying guidance separates material-specific instructions from general advice. A dry storage box is not an active dryer. Weigh remaining stock and include support/purge in the next-job estimate.',
  },
  [MaterialId.Abs]: {
    heading: 'A housing near heat is a process decision',
    example:
      'For an illustrative electronics housing, list actual operating temperature, stiffness, enclosure requirements and ventilation arrangements before selecting ABS. A generic heat band is not an allowable service temperature or a flammability certification for the finished print. Layer orientation, wall design and formulation all matter.',
    next: 'Confirm the exact material profile and printer instructions, then try a representative enclosure corner and hole pattern. Compare warp and fit with the intended process. If the printer cannot supply the required environment, choose a supported formulation or redesign rather than assuming maximum nozzle temperature alone proves compatibility.',
  },
  [MaterialId.Asa]: {
    heading: 'Outdoor parts need a full requirement list',
    example:
      'For an illustrative outdoor sensor cover, record sunlight, peak temperature, rain exposure, sustained load and attachment geometry. ASA may be relevant to weather resistance, but the material family does not certify a watertight enclosure, guaranteed colour life or a load-bearing bracket.',
    next: 'Use exact product data and printer enclosure/ventilation guidance. A nominal printer-temperature capability is not the whole preparation requirement. Compare PETG versus ASA on the actual exposure and hardware burden, print a representative mounting feature, and keep any outdoor lifetime claim conditional on evidence.',
  },
  [MaterialId.Tpu]: {
    heading: 'A protective case is a stiffness and fit experiment',
    example:
      'For an illustrative flexible case, distinguish compliance, grip and impact absorption from a certified protection rating. Different TPU hardness grades behave differently; a generic family name cannot choose the wall count, feeding arrangement or clearance for a particular phone or tool.',
    next: 'Confirm the exact hardness, compatible extruder path and spool profile. Print a short corner/clip coupon before a whole enclosure and test insertion/removal with the actual mating item. Use complete sliced consumption for the spool calculation and do not infer a supported high-speed profile from a soft-material label.',
  },
  [MaterialId.Nylon]: {
    heading: 'Drying and feeding during a long job',
    example:
      'For an illustrative eight-hour functional part, check the exact PA formulation\u2019s drying instructions and whether it should be protected while feeding. A moist spool, a dry spool in open room air and a spool feeding from suitable storage are different starting conditions. The nylon family includes blends and filled variants with different needs.',
    next: 'Verify the equipment operating mode, spool dimensions and feed-path freedom. A storage box does not establish an active drying cycle. Filled variants also require exact nozzle-wear and printer-fitment evidence. Compare material/geometry test pieces and avoid promising engineering strength from the family name.',
  },
  [MaterialId.Pc]: {
    heading: 'Verify the exact blend and printer environment',
    example:
      'For an illustrative heat-exposed guard, distinguish an easy-print PC blend from another polycarbonate formulation. The family name and broad temperature range do not establish the correct enclosure, bed preparation, dimensions after cooling or safe service load for your specific part.',
    next: 'Read the product datasheet and printer guidance, verify the full profile and make a representative fit/warp coupon. A 5.0 mm hole can change in the printed process even when its mesh dimensions are correct. Use observed fit compensation rather than an invented universal shrinkage factor.',
  },
  [MaterialId.Pp]: {
    heading: 'Low density does not solve adhesion or stiffness',
    example:
      'For an illustrative flexible hinge or container insert, list required bend cycles, stiffness, contact environment and mating dimensions before choosing polypropylene. A low-density family can produce a lighter solid estimate, but that says little about bed adhesion, long-term hinge life or suitability for a particular contact use.',
    next: 'Verify the exact formulation\u2019s build-surface and profile requirements and test a short hinge coupon. Do not infer food-contact or pressure-vessel suitability from the polymer family. Convert measured mass with the product density and include full sliced consumption when checking partial-spool sufficiency.',
  },
};
