import { gramsToMetres } from '../filament-length-calculator/filament-length-calculator';

const nonnegative = (value: number) => Number.isFinite(value) && value >= 0;
const positive = (value: number) => Number.isFinite(value) && value > 0;

export function spoolSufficiency(
  gross: number,
  tare: number,
  reserve: number,
  gramsPerCopy: number,
  diameter: number,
  density: number,
) {
  if (
    ![gross, tare, reserve].every(nonnegative) ||
    gross < tare ||
    ![gramsPerCopy, diameter, density].every(positive)
  ) {
    return null;
  }
  const remaining = gross - tare;
  const usable = Math.max(0, remaining - reserve);
  return {
    remaining,
    usable,
    metres: remaining === 0 ? 0 : gramsToMetres(remaining, diameter, density),
    surplus: usable - gramsPerCopy,
    copies: Math.floor(usable / gramsPerCopy),
  };
}

export function wallPlan(
  nozzle: number,
  width: number,
  wall: number,
  layer: number,
) {
  if (![nozzle, width, wall, layer].every(positive)) {
    return null;
  }
  const lines = Math.max(1, Math.round(wall / width));
  return {
    lines,
    nominalThickness: lines * width,
    difference: lines * width - wall,
    layerRatio: layer / nozzle,
    reviewLayer: layer > nozzle * 0.8,
  };
}

export function volumetricPlan(
  width: number,
  height: number,
  speed: number,
  limit: number | null,
) {
  if (
    ![width, height, speed].every(positive) ||
    (limit !== null && !positive(limit))
  ) {
    return null;
  }
  const flow = width * height * speed;
  return {
    flow,
    speedAtLimit: limit === null ? null : limit / (width * height),
    exceeds: limit === null ? null : flow > limit,
  };
}

export const TimeOccurrence = { Earlier: 'earlier', Later: 'later' } as const;
export type TimeOccurrence =
  (typeof TimeOccurrence)[keyof typeof TimeOccurrence];

function localParts(instant: number, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}

/** Resolve a wall-clock time using the offsets around it, rejecting a DST gap. */
export function zonedStart(
  local: string,
  zone: string,
  occurrence: TimeOccurrence = TimeOccurrence.Earlier,
): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) {
    return null;
  }
  const naive = Date.parse(`${local}:00Z`);
  if (
    !Number.isFinite(naive) ||
    new Date(naive).toISOString().slice(0, 16) !== local
  ) {
    return null;
  }
  try {
    const offsets = new Set<number>();
    for (let hours = -36; hours <= 36; hours += 6) {
      const probe = naive + hours * 3600000;
      offsets.add(Date.parse(`${localParts(probe, zone)}:00Z`) - probe);
    }
    const candidates = [...offsets]
      .map((offset) => naive - offset)
      .filter((instant) => localParts(instant, zone) === local)
      .sort((a, b) => a - b);
    return candidates.length
      ? candidates[
          occurrence === TimeOccurrence.Later ? candidates.length - 1 : 0
        ]
      : null;
  } catch {
    return null;
  }
}

export function finishTime(
  start: number,
  hours: number,
  minutes: number,
  allowance: number,
  correction: number,
) {
  if (
    !Number.isFinite(start) ||
    ![hours, minutes, allowance].every(nonnegative) ||
    minutes >= 60 ||
    !positive(correction)
  ) {
    return null;
  }
  const durationMinutes = (hours * 60 + minutes) * correction + allowance;
  const finish = start + durationMinutes * 60000;
  if (durationMinutes <= 0 || !Number.isFinite(new Date(finish).getTime())) {
    return null;
  }
  return { finish, durationMinutes };
}

export function localNow(zone: string): string {
  return localParts(Date.now(), zone);
}
