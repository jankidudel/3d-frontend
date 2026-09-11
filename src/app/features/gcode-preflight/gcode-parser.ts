export interface GcodePoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface GcodePath {
  readonly from: GcodePoint;
  readonly to: GcodePoint;
  readonly extrusion: boolean;
}

export interface GcodeLayer {
  readonly z: number;
  readonly paths: readonly GcodePath[];
}

export interface GcodeMetadata {
  readonly slicer?: string;
  readonly printTime?: string;
  readonly declaredLayers?: number;
  readonly filament?: readonly string[];
  readonly hasThumbnail: boolean;
}

export interface TemperatureTarget {
  readonly value: number;
  readonly waiting: boolean;
  readonly line: number;
}

export interface GcodeExtents {
  readonly min: GcodePoint;
  readonly max: GcodePoint;
}

export interface GcodeReport {
  readonly metadata: GcodeMetadata;
  readonly extents: GcodeExtents | null;
  readonly layers: readonly GcodeLayer[];
  readonly extrusionMoves: number;
  readonly travelMoves: number;
  readonly hotendTargets: readonly TemperatureTarget[];
  readonly bedTargets: readonly TemperatureTarget[];
  readonly unit: 'mm' | 'in';
  readonly positioning: 'absolute' | 'relative';
  readonly extrusionMode: 'absolute' | 'relative';
  readonly tools: readonly number[];
  readonly limitations: readonly string[];
}

export class GcodeParseError extends Error {
  constructor(
    readonly line: number,
    message: string,
  ) {
    super(`Line ${line}: ${message}`);
  }
}

const SUPPORTED = new Set([
  'G0',
  'G1',
  'G20',
  'G21',
  'G90',
  'G91',
  'G92',
  'M82',
  'M83',
  'M104',
  'M109',
  'M140',
  'M190',
]);

/** Parses a conservative, read-only subset of common FDM G-code. */
export function parseGcode(text: string): GcodeReport {
  if (!text.trim()) {
    throw new GcodeParseError(1, 'The file is empty.');
  }
  let point: GcodePoint = { x: 0, y: 0, z: 0 };
  let extrusionPosition = 0;
  let unit: 'mm' | 'in' = 'mm';
  let positioning: 'absolute' | 'relative' = 'absolute';
  let extrusionMode: 'absolute' | 'relative' = 'absolute';
  let extents: GcodeExtents | null = null;
  let extrusionMoves = 0;
  let travelMoves = 0;
  const layers = new Map<number, GcodePath[]>();
  const hotendTargets: TemperatureTarget[] = [];
  const bedTargets: TemperatureTarget[] = [];
  const tools = new Set<number>();
  const limitations = new Set<string>();
  const metadata: MutableMetadata = { filament: [], hasThumbnail: false };

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const { commandText, comment } = splitComment(rawLine);
    readMetadata(comment, metadata);
    const cleaned = commandText.trim();
    if (!cleaned) {
      return;
    }
    const instruction = cleaned.replace(/^N\d+\s*/i, '').trim();
    const commandMatch = /^([GMT]\d+)\s*(.*)$/i.exec(instruction);
    if (!commandMatch) {
      throw new GcodeParseError(line, 'The command is malformed.');
    }
    const command = commandMatch[1].toUpperCase();
    if (!command) {
      return;
    }
    if (/^T\d+$/.test(command)) {
      const tool = Number(command.slice(1));
      tools.add(tool);
      if (tool !== 0) {
        limitations.add(
          'Multiple tools are present; this preview tracks one shared path.',
        );
      }
      return;
    }
    if (command === 'G2' || command === 'G3') {
      limitations.add(
        'Arc moves (G2/G3) are not included in the parsed preview or extents.',
      );
      return;
    }
    if (!SUPPORTED.has(command)) {
      limitations.add(
        `Unsupported command ${command} on line ${line} may affect printer behaviour.`,
      );
      return;
    }
    const values = readValues(commandMatch[2], line, unit);
    switch (command) {
      case 'G20':
        unit = 'in';
        return;
      case 'G21':
        unit = 'mm';
        return;
      case 'G90':
        positioning = 'absolute';
        return;
      case 'G91':
        positioning = 'relative';
        return;
      case 'M82':
        extrusionMode = 'absolute';
        return;
      case 'M83':
        extrusionMode = 'relative';
        return;
      case 'G92':
        point = {
          x: values.x ?? point.x,
          y: values.y ?? point.y,
          z: values.z ?? point.z,
        };
        extrusionPosition = values.e ?? extrusionPosition;
        return;
      case 'M104':
      case 'M109':
        addTemperature(hotendTargets, values.s, command === 'M109', line);
        return;
      case 'M140':
      case 'M190':
        addTemperature(bedTargets, values.s, command === 'M190', line);
        return;
      case 'G0':
      case 'G1': {
        const from = point;
        const to =
          positioning === 'absolute'
            ? {
                x: values.x ?? point.x,
                y: values.y ?? point.y,
                z: values.z ?? point.z,
              }
            : {
                x: point.x + (values.x ?? 0),
                y: point.y + (values.y ?? 0),
                z: point.z + (values.z ?? 0),
              };
        const nextExtrusion =
          extrusionMode === 'absolute'
            ? (values.e ?? extrusionPosition)
            : extrusionPosition + (values.e ?? 0);
        const extrusion = nextExtrusion > extrusionPosition;
        point = to;
        extrusionPosition = nextExtrusion;
        if (hasMotion(values)) {
          extents = include(extents, from);
          extents = include(extents, to);
          const path = { from, to, extrusion };
          const paths = layers.get(to.z) ?? [];
          paths.push(path);
          layers.set(to.z, paths);
          if (extrusion) {
            extrusionMoves++;
          } else {
            travelMoves++;
          }
        }
      }
    }
  });

  if (!extents) {
    throw new GcodeParseError(1, 'No readable G0 or G1 motion was found.');
  }
  return {
    metadata: {
      ...metadata,
      filament: metadata.filament.length ? metadata.filament : undefined,
    },
    extents,
    layers: [...layers.entries()]
      .sort(([a], [b]) => a - b)
      .map(([z, paths]) => ({ z, paths })),
    extrusionMoves,
    travelMoves,
    hotendTargets,
    bedTargets,
    unit,
    positioning,
    extrusionMode,
    tools: [...tools].sort((a, b) => a - b),
    limitations: [...limitations],
  };
}

export function buildVolumeMessage(
  report: GcodeReport,
  volume: GcodePoint,
): string | null {
  if (!report.extents || !positive(volume)) {
    return null;
  }
  const size = dimensions(report.extents);
  return size.x > volume.x || size.y > volume.y || size.z > volume.z
    ? 'The parsed motion extents exceed the entered dimensions.'
    : 'The parsed motion extents are within the entered dimensions. This does not prove compatibility.';
}

export function dimensions(extents: GcodeExtents): GcodePoint {
  return {
    x: extents.max.x - extents.min.x,
    y: extents.max.y - extents.min.y,
    z: extents.max.z - extents.min.z,
  };
}

type Values = Partial<Record<'x' | 'y' | 'z' | 'e' | 's', number>>;
interface MutableMetadata {
  slicer?: string;
  printTime?: string;
  declaredLayers?: number;
  filament: string[];
  hasThumbnail: boolean;
}

function splitComment(line: string): { commandText: string; comment: string } {
  const semicolon = line.indexOf(';');
  const commandText = (semicolon < 0 ? line : line.slice(0, semicolon)).replace(
    /\([^)]*\)/g,
    '',
  );
  return {
    commandText,
    comment: semicolon < 0 ? '' : line.slice(semicolon + 1).trim(),
  };
}
function readValues(
  parameterText: string,
  line: number,
  unit: 'mm' | 'in',
): Values {
  const values: Values = {};
  const factor = unit === 'in' ? 25.4 : 1;
  // Scientific notation is intentionally not accepted: in compact G-code,
  // `X2E1` means X2 followed by extrusion E1, not an exponent.
  const tokenPattern = /([XYZESF])\s*([-+]?\d*\.?\d+)/gi;
  const tokens = [...parameterText.matchAll(tokenPattern)];
  const remainder = parameterText.replace(tokenPattern, '').trim();
  if (remainder) {
    throw new GcodeParseError(
      line,
      `Unsupported or malformed parameter "${remainder}".`,
    );
  }
  for (const match of tokens) {
    const key = match[1].toLowerCase();
    const number = Number(match[2]);
    if (!Number.isFinite(number)) {
      throw new GcodeParseError(line, `Invalid ${match[1]} value.`);
    }
    if (key !== 's' && key !== 'f') {
      values[key as keyof Values] = number * factor;
    }
    if (key === 's') {
      values.s = number;
    }
  }
  return values;
}
function addTemperature(
  targets: TemperatureTarget[],
  value: number | undefined,
  waiting: boolean,
  line: number,
): void {
  if (value !== undefined) {
    targets.push({ value, waiting, line });
  }
}
function hasMotion(values: Values): boolean {
  return (
    values.x !== undefined || values.y !== undefined || values.z !== undefined
  );
}
function include(
  extents: GcodeExtents | null,
  point: GcodePoint,
): GcodeExtents {
  if (!extents) {
    return { min: { ...point }, max: { ...point } };
  }
  return {
    min: {
      x: Math.min(extents.min.x, point.x),
      y: Math.min(extents.min.y, point.y),
      z: Math.min(extents.min.z, point.z),
    },
    max: {
      x: Math.max(extents.max.x, point.x),
      y: Math.max(extents.max.y, point.y),
      z: Math.max(extents.max.z, point.z),
    },
  };
}
function positive(point: GcodePoint): boolean {
  return (
    point.x > 0 &&
    point.y > 0 &&
    point.z > 0 &&
    Number.isFinite(point.x + point.y + point.z)
  );
}
function readMetadata(comment: string, metadata: MutableMetadata): void {
  const value = comment.trim();
  if (/^thumbnail(?:_begin| begin)?/i.test(value)) {
    metadata.hasThumbnail = true;
  }
  const slicer = /^(?:generated with|sliced by|generated by)\s+(.+)$/i.exec(
    value,
  );
  if (slicer) {
    metadata.slicer = slicer[1].trim();
  }
  const time =
    /^(?:estimated printing time(?: \([^)]*\))?|print time|time)\s*(?:=|:)\s*(.+)$/i.exec(
      value,
    );
  if (time) {
    metadata.printTime = time[1].trim();
  }
  const layer = /^(?:layer_count|layer count)\s*(?:=|:)\s*(\d+)/i.exec(value);
  if (layer) {
    metadata.declaredLayers = Number(layer[1]);
  }
  const filament =
    /^(?:filament used|filament length|filament_volume|filament used \[g\])\s*(?:=|:)\s*(.+)$/i.exec(
      value,
    );
  if (filament) {
    metadata.filament.push(filament[1].trim());
  }
}
