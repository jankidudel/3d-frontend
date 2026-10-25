import { MaterialId } from './material-catalogue';

type PreparationBrief = Readonly<{
  setup: string;
  surface: string;
  question: string;
  decision: string;
  trial: string;
  reviewedAt: string;
}>;

/** Editorial preparation steps; proposed checks are not observed print results. */
export const materialPreparation: Readonly<
  Record<MaterialId, PreparationBrief>
> = {
  [MaterialId.Pla]: {
    setup:
      'PLA is a practical first candidate for detailed visual prototypes with low warping. It is relatively rigid and brittle; a neat-looking fit model does not establish impact resistance.',
    surface:
      'Choose a build surface supported by your printer and PLA profile. Prusa notes that its smooth PEI sheet is useful for small contact areas; that is specific equipment guidance, not a setting for every printer.',
    question: 'Is the prototype only for fit, or will it remain in service?',
    decision:
      'For a display model or an indoor size check, detail and ease of printing can decide the choice. For a part near a warm surface or exposed to knocks, review temperature and toughness separately before keeping PLA as the final material.',
    trial:
      'Print only the mounting tab or mating corner first. Check the actual mating item and inspect any thin clip that must bend during assembly. A successful insertion checks that fit; it does not establish a service-load or lifetime rating.',
    reviewedAt: '2026-10-25',
  },
  [MaterialId.Petg]: {
    setup:
      'PETG is often chosen for handled functional parts. Its print-preparation tradeoffs include stringing and more difficult bridging or support removal than a simple PLA prototype.',
    surface:
      'Check the release instructions for the exact build plate. Prusa cautions that PETG can bond too strongly to smooth PEI; use the surface and separation method specified for your equipment.',
    question: 'Will supports be accessible after printing?',
    decision:
      'For a bracket with an enclosed channel, support removal and the required surface can matter as much as material toughness. Examine the proposed orientation and sliced support paths before committing to the complete part.',
    trial:
      'Print a short section containing the channel or supported underside. Inspect support access and the retained surface, then compare the intended layer direction and fit before extending the job.',
    reviewedAt: '2026-10-25',
  },
  [MaterialId.Abs]: {
    setup:
      'ABS preparation needs particular attention to warping and the printing environment. Prusa describes enclosure and ventilation requirements; nozzle capability alone is not a complete setup.',
    surface:
      'Follow the exact build-sheet and material instructions. Do not transfer a release or adhesion method from another surface without checking its compatibility.',
    question: 'Can the printer maintain the required environment?',
    decision:
      'A housing that fits the nominal bed can still be difficult to produce if its corners lift. Establish the enclosure, draft control and material profile before choosing ABS solely from a temperature-resistance description.',
    trial:
      'Print a representative housing corner with its mounting hole. After cooling, record corner lift and the mating dimension. Keep local hole adjustment separate from any measured whole-part scale change.',
    reviewedAt: '2026-10-25',
  },
  [MaterialId.Asa]: {
    setup:
      'ASA is a candidate for outdoor parts where UV resistance matters, but large parts can still warp. The source guidance calls for controlled printing conditions and appropriate ventilation.',
    surface:
      'Check the selected sheet and the exact ASA profile together. Preparation that works on one plate coating is not automatically suitable for another.',
    question:
      'Does the outdoor requirement concern the polymer or the whole enclosure?',
    decision:
      'UV resistance helps shortlist a material. It does not establish sealing at a lid, water entry around a fastener or acceptable movement under sustained load. Evaluate those features separately.',
    trial:
      'Print the lid edge and attachment feature before the full cover. Record fit after cooling and inspect the intended seal geometry. This check does not establish outdoor lifetime or an ingress-protection rating.',
    reviewedAt: '2026-10-25',
  },
  [MaterialId.Tpu]: {
    setup:
      'Choose a specific TPU hardness and a compatible feeding path. Flexible-filament handling, stringing and bridge performance are different preparation questions from those for a rigid material.',
    surface:
      'Flexible materials can adhere strongly to a plate. Use the build-sheet supplier and filament maker instructions for release, rather than increasing adhesion by default.',
    question: 'Does the part need to bend, compress or simply grip?',
    decision:
      'These are different design goals. A family name or hardness value does not select wall geometry or the force needed to insert a mating part.',
    trial:
      'Print one corner of a case or a short section of a flexible insert. Check insertion, removal and the deformation you actually need. Change geometry or grade deliberately before printing the entire enclosure.',
    reviewedAt: '2026-10-25',
  },
  [MaterialId.Nylon]: {
    setup:
      'Identify the exact polyamide and whether it is filled. Prusa highlights moisture management and notes that unfilled and fibre-filled formulations can have different warping and enclosure needs.',
    surface:
      'Select the surface and drying/storage procedure for that formulation. A profile for a filled PA product is not evidence that a different unfilled nylon will behave the same way.',
    question:
      'Will moisture exposure change between the trial and the long job?',
    decision:
      'Compare drying, storage and feeding conditions before interpreting a dimensional or surface difference. The same CAD and slicer values do not establish the same material condition.',
    trial:
      'Retain a small mating-feature coupon and the spool preparation record. Use comparable conditions when checking the next revision, and record elapsed exposure rather than attributing every change to scaling.',
    reviewedAt: '2026-10-25',
  },
  [MaterialId.Pc]: {
    setup:
      'Pure PC and easier-printing PC blends need different preparation. Prusa identifies moisture, warping and the required printing temperatures as practical constraints.',
    surface:
      'Confirm the exact blend and sheet combination, including any required release layer. Do not generalise a PC Blend surface instruction to every polycarbonate formulation.',
    question: 'Does a small successful print represent the full footprint?',
    decision:
      'A small fit sample can answer a local assembly question while a larger footprint introduces a different warping challenge. Keep those observations separate when planning a large guard or cover.',
    trial:
      'Start with the critical mating region, then evaluate a representative base section before a complete large part. Record cooled dimensions and corner lift, not just whether the print finished.',
    reviewedAt: '2026-10-25',
  },
  [MaterialId.Pp]: {
    setup:
      'PP is lightweight and can be flexible, but its build-surface adhesion and warping can make preparation difficult. Filled versions are separate formulations, not interchangeable substitutes.',
    surface:
      'Prusa recommends its PP sheet or other PP-specific preparation for the appropriate product. A PEI setup used for PLA should not be assumed suitable for PP.',
    question: 'Is the challenge first-layer adhesion or the intended bend?',
    decision:
      'Confirm a supported surface before changing the hinge design to compensate for a failed first layer. Once the geometry prints as intended, assess the actual bending requirement separately.',
    trial:
      'Print a short hinge or insert section on the specified surface. Observe cooled fit and the required motion. A few successful bends do not establish fatigue life, sealing or suitability for a particular contact use.',
    reviewedAt: '2026-10-25',
  },
};
