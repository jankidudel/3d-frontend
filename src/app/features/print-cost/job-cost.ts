export const MAX_JOB_PLATES = 24;
export const MAX_PLATE_MATERIALS = 8;
export const MAX_JOB_QUANTITY = 100000;
export const MaterialBasis = {
  Complete: 'complete-slicer-total',
  Partial: 'reported-subtotal-plus-unreported-material',
} as const;
export type MaterialBasis = (typeof MaterialBasis)[keyof typeof MaterialBasis];
export interface JobMaterial {
  label: string;
  grams: number;
  additionalGrams: number;
  spoolGrams: number;
  spoolPrice: number;
  basis: MaterialBasis;
}
export interface JobPlate {
  id: number;
  label: string;
  source: string;
  hours: number;
  repeats: number;
  unitsPerRun: number;
  handlingMinutes: number;
  wattsOverride: number | null;
  machineRateOverride: number | null;
  materials: JobMaterial[];
}
export interface JobCostInputs {
  reference: string;
  currency: string;
  requestedQuantity: number;
  identicalParts: boolean;
  plates: JobPlate[];
  watts: number;
  electricityRate: number;
  machineRate: number;
  machineIncludesEnergy: boolean;
  labourRate: number;
  preparationMinutes: number;
  finishingMinutesPerPart: number;
  packaging: number;
  shipping: number;
  hardware: number;
  failurePercent: number;
}
export function blankPlate(id: number): JobPlate {
  return {
    id,
    label: `Plate ${id}`,
    source: '',
    hours: NaN,
    repeats: 1,
    unitsPerRun: 1,
    handlingMinutes: 0,
    wattsOverride: null,
    machineRateOverride: null,
    materials: [
      {
        label: '',
        grams: NaN,
        additionalGrams: 0,
        spoolGrams: 1000,
        spoolPrice: 20,
        basis: MaterialBasis.Complete,
      },
    ],
  };
}
export function blankJob(): JobCostInputs {
  return {
    reference: '',
    currency: 'GBP',
    requestedQuantity: 1,
    identicalParts: false,
    plates: [blankPlate(1)],
    watts: 120,
    electricityRate: 0.3,
    machineRate: 0,
    machineIncludesEnergy: false,
    labourRate: 0,
    preparationMinutes: 0,
    finishingMinutesPerPart: 0,
    packaging: 0,
    shipping: 0,
    hardware: 0,
    failurePercent: 0,
  };
}
export function workedJob(): JobCostInputs {
  const job = blankJob();
  return {
    ...job,
    reference: 'Fictional five-part job',
    currency: 'OTHER',
    requestedQuantity: 5,
    identicalParts: true,
    machineRate: 2,
    labourRate: 18,
    preparationMinutes: 20,
    finishingMinutesPerPart: 5,
    packaging: 1.6,
    plates: [
      {
        ...blankPlate(1),
        label: 'Plate A',
        source: 'Hypothetical sliced inputs, not measurements',
        hours: 4,
        unitsPerRun: 3,
        handlingMinutes: 10,
        materials: [
          {
            label: 'Same filament / spool scope',
            grams: 90,
            additionalGrams: 0,
            spoolGrams: 1000,
            spoolPrice: 24,
            basis: MaterialBasis.Complete,
          },
        ],
      },
      {
        ...blankPlate(2),
        label: 'Plate B',
        source: 'Hypothetical sliced inputs, not measurements',
        hours: 3,
        unitsPerRun: 2,
        handlingMinutes: 10,
        materials: [
          {
            label: 'Same filament / spool scope',
            grams: 70,
            additionalGrams: 0,
            spoolGrams: 1000,
            spoolPrice: 24,
            basis: MaterialBasis.Complete,
          },
        ],
      },
    ],
  };
}
const validNumber = (value: number) =>
  Number.isFinite(value) && value >= 0 && value <= 1e9;
const validCount = (value: number) =>
  validNumber(value) &&
  Number.isInteger(value) &&
  value > 0 &&
  value <= MAX_JOB_QUANTITY;
export function calculateJobCost(input: JobCostInputs) {
  const numbers = [
    input.watts,
    input.electricityRate,
    input.machineRate,
    input.labourRate,
    input.preparationMinutes,
    input.finishingMinutesPerPart,
    input.packaging,
    input.shipping,
    input.hardware,
    input.failurePercent,
  ];
  if (
    numbers.some((n) => !validNumber(n)) ||
    !validCount(input.requestedQuantity) ||
    input.failurePercent > 100 ||
    !input.plates.length ||
    input.plates.length > MAX_JOB_PLATES
  ) {
    return null;
  }
  const plates = [];
  for (const plate of input.plates) {
    if (
      !plate.label.trim() ||
      !plate.source.trim() ||
      !validNumber(plate.hours) ||
      plate.hours <= 0 ||
      !validCount(plate.repeats) ||
      !validCount(plate.unitsPerRun) ||
      !validNumber(plate.handlingMinutes) ||
      (plate.wattsOverride !== null && !validNumber(plate.wattsOverride)) ||
      (plate.machineRateOverride !== null &&
        !validNumber(plate.machineRateOverride)) ||
      !plate.materials.length ||
      plate.materials.length > MAX_PLATE_MATERIALS
    ) {
      return null;
    }
    let materialCost = 0;
    let grams = 0;
    for (const material of plate.materials) {
      if (
        !material.label.trim() ||
        ![
          material.grams,
          material.additionalGrams,
          material.spoolGrams,
          material.spoolPrice,
        ].every(validNumber) ||
        material.spoolGrams <= 0 ||
        !Object.values(MaterialBasis).includes(material.basis) ||
        (material.basis === MaterialBasis.Complete &&
          material.additionalGrams !== 0)
      ) {
        return null;
      }
      grams += (material.grams + material.additionalGrams) * plate.repeats;
      materialCost +=
        ((material.grams + material.additionalGrams) / material.spoolGrams) *
        material.spoolPrice *
        plate.repeats;
    }
    const hours = plate.hours * plate.repeats;
    const energy = input.machineIncludesEnergy
      ? 0
      : ((hours * (plate.wattsOverride ?? input.watts)) / 1000) *
        input.electricityRate;
    const machine = hours * (plate.machineRateOverride ?? input.machineRate);
    const handling =
      (plate.handlingMinutes / 60) * input.labourRate * plate.repeats;
    plates.push({
      label: plate.label,
      runs: plate.repeats,
      plannedQuantity: plate.unitsPerRun * plate.repeats,
      hours,
      grams,
      materialCost,
      energy,
      machine,
      handling,
      subtotal: materialCost + energy + machine + handling,
    });
  }
  const plannedQuantity = plates.reduce((n, p) => n + p.plannedQuantity, 0);
  if (plannedQuantity > MAX_JOB_QUANTITY) {
    return null;
  }
  const material = plates.reduce((n, p) => n + p.materialCost, 0);
  const energy = plates.reduce((n, p) => n + p.energy, 0);
  const machine = plates.reduce((n, p) => n + p.machine, 0);
  const handling = plates.reduce((n, p) => n + p.handling, 0);
  const preparation = (input.preparationMinutes / 60) * input.labourRate;
  const finishing =
    (input.finishingMinutesPerPart / 60) * input.labourRate * plannedQuantity;
  const subtotal =
    material +
    energy +
    machine +
    handling +
    preparation +
    finishing +
    input.packaging +
    input.shipping +
    input.hardware;
  const failureAllowance = (subtotal * input.failurePercent) / 100;
  const total = subtotal + failureAllowance;
  const numericResults = [
    material,
    energy,
    machine,
    handling,
    preparation,
    finishing,
    subtotal,
    failureAllowance,
    total,
  ];
  if (numericResults.some((n) => !Number.isFinite(n) || n > 1e15)) {
    return null;
  }
  return {
    plates,
    plannedQuantity,
    material,
    energy,
    machine,
    handling,
    preparation,
    finishing,
    packaging: input.packaging,
    shipping: input.shipping,
    hardware: input.hardware,
    subtotal,
    failureAllowance,
    total,
    allocatedAverage: input.identicalParts ? total / plannedQuantity : null,
    sequentialHours: plates.reduce((n, p) => n + p.hours, 0),
    grams: plates.reduce((n, p) => n + p.grams, 0),
  };
}
export function jobRecord(input: JobCostInputs) {
  const result = calculateJobCost(input);
  if (!result) {
    return null;
  }
  return {
    schema: 'inspectmesh-job-1',
    inputs: structuredClone(input),
    result,
    quantityBasis:
      'Requested and planned quantities are estimates. Accepted, rejected and delivered quantities have not been measured.',
    failureMethod:
      'Percentage uplift of all entered production costs, including order costs; not a probability-of-success model.',
    energyBasis: input.machineIncludesEnergy
      ? 'Energy included in entered machine rates; separate energy charge suppressed.'
      : 'Machine allowance excludes separate energy.',
    scope:
      'Preparation, packaging, shipping and hardware once per order; handling each run; finishing each planned part.',
    exclusions:
      'Unentered work, selling fees, taxes and scheduling gaps. No production guarantee.',
    rounding:
      'JSON retains full precision; the interface rounds money for display and text/PDF records show up to six decimal places. Rounded unit amounts may not multiply to rounded order total.',
  };
}
export function jobRecordLines(
  record: NonNullable<ReturnType<typeof jobRecord>>,
): string[] {
  const { inputs: i, result: r } = record;
  const display = (value: number) =>
    new Intl.NumberFormat('en', { maximumFractionDigits: 6 }).format(value);
  const lines = [
    `InspectMesh job estimate: ${i.reference || 'No reference'}`,
    `Currency ${i.currency}; requested ${i.requestedQuantity}; planned ${r.plannedQuantity}`,
    record.quantityBasis,
    `Defaults: ${i.watts} W; electricity ${i.electricityRate}/kWh; machine ${i.machineRate}/h; labour ${i.labourRate}/h`,
    record.energyBasis,
  ];
  for (const [index, p] of i.plates.entries()) {
    lines.push(
      `${p.label}: ${p.repeats} runs x ${p.hours} h; ${p.unitsPerRun} planned units/run; handling ${p.handlingMinutes} min/run`,
      `Source: ${p.source}; power override ${p.wattsOverride ?? 'inherit'}; machine override ${p.machineRateOverride ?? 'inherit'}`,
    );
    for (const m of p.materials) {
      lines.push(
        `${m.label}: ${m.grams} g + ${m.additionalGrams} additional g/run; ${m.spoolPrice}/${m.spoolGrams} g; ${m.basis}`,
      );
    }
    lines.push(
      `Plate production subtotal: ${display(r.plates[index]!.subtotal)}`,
    );
  }
  lines.push(
    `Order preparation ${i.preparationMinutes} min: ${display(r.preparation)}; finishing ${i.finishingMinutesPerPart} min/part: ${display(r.finishing)}`,
    `Material ${display(r.material)}; energy ${display(r.energy)}; machine ${display(r.machine)}; handling ${display(r.handling)}`,
    `Packaging ${display(r.packaging)}; shipping ${display(r.shipping)}; hardware ${display(r.hardware)}`,
    `Failure uplift ${i.failurePercent}%: ${display(r.failureAllowance)}`,
    `Total production cost: ${display(r.total)}; allocated average: ${r.allocatedAverage === null ? 'not offered for mixed parts' : display(r.allocatedAverage)}`,
    `Sequential sliced duration: ${display(r.sequentialHours)} h; consumption: ${display(r.grams)} g`,
    record.scope,
    record.failureMethod,
    record.exclusions,
    record.rounding,
  );
  return lines;
}
