export interface GcodePoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface GcodePath {
  readonly from: GcodePoint;
  readonly to: GcodePoint;
  readonly extrusion: boolean;
  readonly line: number;
}

export interface GcodeLayer {
  readonly z: number;
  readonly paths: readonly GcodePath[];
}

export interface GcodeLayerMoveCounts {
  readonly extrusion: number;
  readonly travel: number;
}

export interface GcodeMetadata {
  readonly slicer?: string;
  readonly printTime?: string;
  readonly declaredLayers?: number;
  readonly filament?: readonly string[];
  readonly hasThumbnail: boolean;
}

export interface TemperatureTarget {
  readonly excerpt: string;
  readonly value: number;
  readonly waiting: boolean;
  readonly line: number;
}

export interface GcodeExtents {
  readonly min: GcodePoint;
  readonly max: GcodePoint;
}

export const GcodeCoverage = {
  Recognised: 'recognised',
  Incomplete: 'incomplete',
  Unavailable: 'unavailable',
} as const;
export type GcodeCoverage = (typeof GcodeCoverage)[keyof typeof GcodeCoverage];
export const GcodeFindingKind = {
  State: 'state',
  Auxiliary: 'auxiliary',
  Unsupported: 'unsupported',
  Metadata: 'metadata',
} as const;
export type GcodeFindingKind =
  (typeof GcodeFindingKind)[keyof typeof GcodeFindingKind];
export const GCODE_REPORT_VERSION = 2;
export const GCODE_MAX_LINE_LENGTH = 4096;
export const GCODE_MAX_LINES = 200_000;
export const GCODE_MAX_PATHS = 50_000;
export const GCODE_MAX_FINDINGS = 100;
export const GCODE_EXCERPT_LENGTH = 240;
export interface GcodeEvidence {
  readonly line: number;
  readonly excerpt: string;
  readonly pathLine?: number;
}
export interface GcodeFinding {
  readonly command: string;
  readonly kind: GcodeFindingKind;
  readonly interpretation: string;
  readonly action: string;
  readonly count: number;
  readonly firstLine: number;
  readonly lastLine: number;
  readonly samples: readonly GcodeEvidence[];
}
export interface GcodeEstimate {
  readonly basis: string;
  readonly value: number;
  readonly unit: string;
  readonly line: number;
  readonly source: string;
  readonly scope: string;
}

export interface GcodeReport {
  readonly version: number;
  readonly assumptions: readonly string[];
  readonly findings: readonly GcodeFinding[];
  readonly coverage: {
    readonly linear: GcodeCoverage;
    readonly extrusion: GcodeCoverage;
    readonly duration: GcodeCoverage;
    readonly material: GcodeCoverage;
  };
  readonly counts: {
    readonly supported: number;
    readonly auxiliary: number;
    readonly unsupported: number;
    readonly reviewedLines: number;
    readonly totalLines: number;
  };
  readonly previewTruncated: boolean;
  readonly duration: GcodeEstimate | null;
  readonly material: GcodeEstimate | null;
  readonly extrusionExtents: GcodeExtents | null;
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
  if (
    [...text.slice(0, 4096)].some((character) => {
      const code = character.charCodeAt(0);
      return code < 9 || (code > 13 && code < 32) || code === 65533;
    })
  ) {
    throw new GcodeParseError(
      1,
      'Binary or undecodable input is unavailable. Export plain text or use the native viewer.',
    );
  }
  let point: GcodePoint = { x: 0, y: 0, z: 0 };
  let extrusionPosition = 0;
  let unit: 'mm' | 'in' = 'mm';
  let positioning: 'absolute' | 'relative' = 'absolute';
  let extrusionMode: 'absolute' | 'relative' = 'absolute';
  let extents: GcodeExtents | null = null;
  let extrusionExtents: GcodeExtents | null = null;
  let incomplete = false;
  let extrusionIncomplete = false;
  let explicitExtrusionMode = false;
  let supported = 0;
  let auxiliary = 0;
  let unsupported = 0;
  let previewTruncated = false;
  let durationDeclarations = 0;
  let materialDeclarations = 0;
  const slicerDeclarations = new Set<string>();
  const durations: GcodeEstimate[] = [];
  const materials: GcodeEstimate[] = [];
  const findings = new Map<string, GcodeFinding>();
  const evidence = (
    command: string,
    kind: GcodeFindingKind,
    interpretation: string,
    action: string,
    line: number,
    raw: string,
  ) => {
    const old = findings.get(command);
    const sample = { line, excerpt: raw.slice(0, GCODE_EXCERPT_LENGTH) };
    if (old) {
      findings.set(command, {
        ...old,
        count: old.count + 1,
        lastLine: line,
        samples: [...old.samples.slice(0, 2), sample],
      });
    } else if (findings.size < GCODE_MAX_FINDINGS) {
      findings.set(command, {
        command,
        kind,
        interpretation,
        action,
        count: 1,
        firstLine: line,
        lastLine: line,
        samples: [sample],
      });
    }
  };
  let extrusionMoves = 0;
  let travelMoves = 0;
  const layers = new Map<number, GcodePath[]>();
  const hotendTargets: TemperatureTarget[] = [];
  const bedTargets: TemperatureTarget[] = [];
  const tools = new Set<number>();
  const limitations = new Set<string>();
  const metadata: MutableMetadata = { filament: [], hasThumbnail: false };

  const lines = text.split(/\r\n|\n|\r/);
  if (lines.length > GCODE_MAX_LINES) {
    incomplete = true;
    limitations.add(
      `Review stopped at ${GCODE_MAX_LINES.toLocaleString()} source lines; metadata and paths may be partial.`,
    );
  }
  lines.slice(0, GCODE_MAX_LINES).forEach((rawLine, index) => {
    const line = index + 1;
    if (rawLine.length > GCODE_MAX_LINE_LENGTH) {
      throw new GcodeParseError(
        line,
        'Source line exceeds the 4,096-character review limit. Use the native viewer.',
      );
    }
    const { commandText, comment } = splitComment(rawLine);
    readMetadata(comment, metadata);
    if (
      /^(?:generated|sliced|estimated printing time|print time|time\s*[:=]|filament)/i.test(
        comment,
      )
    ) {
      evidence(
        'metadata',
        GcodeFindingKind.Metadata,
        'File comment declaration, not authenticated provenance.',
        'Compare with the original slicer project and select a supported estimate deliberately.',
        line,
        rawLine,
      );
    }
    if (/^(generated with|sliced by|generated by)\s+/i.test(comment)) {
      slicerDeclarations.add(
        comment.replace(/^(generated with|sliced by|generated by)\s+/i, ''),
      );
    }
    if (/^estimated printing time \(normal mode\)/.test(comment)) {
      durationDeclarations++;
    }
    if (/^filament used \[g\]/.test(comment)) {
      materialDeclarations++;
    }
    const timeMatch = /^estimated printing time \(normal mode\) = (.+)$/.exec(
      comment,
    );
    if (timeMatch) {
      const orderedUnits =
        /^(?:\d+d\s*)?(?:\d+h\s*)?(?:\d+m\s*)?(?:\d+s\s*)?$/.test(timeMatch[1]);
      const parts = [...timeMatch[1].matchAll(/(\d+)\s*([dhms])/g)];
      const remainder = timeMatch[1].replace(/(\d+)\s*([dhms])/g, '').trim();
      const seconds = parts.reduce(
        (sum, part) =>
          sum +
          Number(part[1]) * ({ d: 86400, h: 3600, m: 60, s: 1 }[part[2]] ?? 0),
        0,
      );
      if (
        orderedUnits &&
        !remainder &&
        parts.length &&
        Number.isSafeInteger(seconds) &&
        seconds > 0
      ) {
        durations.push({
          value: seconds / 3600,
          unit: 'hours',
          line,
          source: rawLine.slice(0, GCODE_EXCERPT_LENGTH),
          scope: 'one sliced run, normal mode elapsed estimate',
          basis:
            'Converted declared days/hours/minutes/seconds to hours; no timing simulation.',
        });
      }
    }
    const massMatch = /^filament used \[g\] = (\d+(?:\.\d+)?)$/.exec(comment);
    if (
      massMatch &&
      Number(massMatch[1]) > 0 &&
      Number.isFinite(Number(massMatch[1]))
    ) {
      materials.push({
        value: Number(massMatch[1]),
        unit: 'g',
        line,
        source: rawLine.slice(0, GCODE_EXCERPT_LENGTH),
        scope:
          'one declared filament for one sliced run, including reported support/purge',
        basis: 'Parsed grams directly; no density conversion.',
      });
    }
    const cleaned = commandText.trim();
    if (!cleaned) {
      return;
    }
    const instruction = cleaned.replace(/^N\d+\s*/i, '').trim();
    const commandMatch = /^([GMT]\d+)(?![\d.])\s*(.*)$/i.exec(instruction);
    if (!commandMatch) {
      if (/^[A-Z_][A-Z_0-9]*(?:\s|$)/i.test(instruction)) {
        unsupported++;
        incomplete = true;
        extrusionIncomplete = true;
        limitations.add(
          'Unsupported macros may change motion or extrusion state.',
        );
        evidence(
          'macro',
          GcodeFindingKind.Unsupported,
          'Macro effects are not executed or interpreted.',
          'Use the native slicer and exact firmware macro configuration.',
          line,
          rawLine,
        );
        return;
      }
      throw new GcodeParseError(line, 'The command is malformed.');
    }
    const command = commandMatch[1].toUpperCase();
    if (!command) {
      return;
    }
    if (/^T\d+$/.test(command)) {
      const tool = Number(command.slice(1));
      tools.add(tool);
      incomplete = true;
      extrusionIncomplete = true;
      unsupported++;
      evidence(
        'tool',
        GcodeFindingKind.Unsupported,
        'Tool state and offsets are unavailable in the shared-path model.',
        'Review individual tools in the native slicer.',
        line,
        rawLine,
      );
      if (tool !== 0) {
        limitations.add(
          'Multiple tools are present; this preview tracks one shared path.',
        );
      }
      return;
    }
    if (command === 'G2' || command === 'G3') {
      incomplete = true;
      extrusionIncomplete = true;
      unsupported++;
      evidence(
        'arcs',
        GcodeFindingKind.Unsupported,
        'Arc geometry and resulting state are omitted.',
        'Review arcs in the native viewer; subsequent extents are incomplete.',
        line,
        rawLine,
      );
      limitations.add(
        'Arc moves (G2/G3) are not included in the parsed preview or extents.',
      );
      return;
    }
    if (!SUPPORTED.has(command)) {
      // Deliberately narrow: these commands do not move XYZ in the documented
      // linear model. This classification never establishes firmware compatibility.
      if (
        new Set([
          'M105',
          'M106',
          'M107',
          'M115',
          'M117',
          'M118',
          'M400',
          'G4',
        ]).has(command)
      ) {
        auxiliary++;
        evidence(
          command,
          GcodeFindingKind.Auxiliary,
          'Auxiliary action outside geometric review.',
          'Review machine effects in exact firmware documentation.',
          line,
          rawLine,
        );
      } else {
        unsupported++;
        incomplete = true;
        extrusionIncomplete = true;
        if (limitations.size < GCODE_MAX_FINDINGS) {
          limitations.add(
            `Unsupported command ${command} may affect motion/extrusion state.`,
          );
        }
        evidence(
          command,
          GcodeFindingKind.Unsupported,
          'Unsupported state effects; subsequent paths are incomplete.',
          'Inspect the exact firmware/profile and native preview.',
          line,
          rawLine,
        );
      }
      return;
    }
    supported++;
    if (command !== 'G0' && command !== 'G1') {
      evidence(
        command,
        GcodeFindingKind.State,
        {
          G20: 'Subsequent coordinates use inches, converted to millimetres in this report.',
          G21: 'Subsequent coordinates use millimetres.',
          G90: 'Absolute logical XYZ positioning; E mode interactions need exact firmware review.',
          G91: 'Relative logical XYZ positioning; E mode interactions need exact firmware review.',
          M82: 'Absolute E in this disclosed model; positive change, not total E, classifies extrusion.',
          M83: 'Relative E in this disclosed model; each E field is an increment.',
          G92: 'Logical coordinate/extrusion reset, without an ordinary XYZ motion.',
          M104: 'Hotend target set; not measured temperature.',
          M109: 'Hotend target with waiting declared; waiting behaviour is not simulated.',
          M140: 'Bed target set; not measured temperature.',
          M190: 'Bed target with waiting declared; waiting behaviour is not simulated.',
        }[command] ?? 'Recognised state declaration in the linear model.',
        'Check mode order, targets and machine-specific semantics.',
        line,
        rawLine,
      );
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
        if (explicitExtrusionMode) {
          extrusionIncomplete = true;
          limitations.add(
            'G90/G91 after M82/M83 has firmware-dependent E semantics; extrusion classification is incomplete.',
          );
        }
        return;
      case 'G91':
        positioning = 'relative';
        if (explicitExtrusionMode) {
          extrusionIncomplete = true;
          limitations.add(
            'G90/G91 after M82/M83 has firmware-dependent E semantics; extrusion classification is incomplete.',
          );
        }
        return;
      case 'M82':
        if (positioning === 'relative') {
          extrusionIncomplete = true;
          limitations.add(
            'M82 with relative XYZ has firmware-dependent E semantics; extrusion classification is incomplete.',
          );
        }
        extrusionMode = 'absolute';
        explicitExtrusionMode = true;
        return;
      case 'M83':
        extrusionMode = 'relative';
        explicitExtrusionMode = true;
        return;
      case 'G92':
        if (hasMotion(values)) {
          incomplete = true;
          limitations.add(
            'G92 XYZ changes the logical coordinate frame; machine-space bounds are unavailable.',
          );
        }
        point = {
          x: values.x ?? point.x,
          y: values.y ?? point.y,
          z: values.z ?? point.z,
        };
        extrusionPosition = values.e ?? extrusionPosition;
        return;
      case 'M104':
      case 'M109':
        addTemperature(
          hotendTargets,
          values.s,
          command === 'M109',
          line,
          rawLine,
        );
        return;
      case 'M140':
      case 'M190':
        addTemperature(bedTargets, values.s, command === 'M190', line, rawLine);
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
        if (![to.x, to.y, to.z, nextExtrusion].every(Number.isFinite)) {
          throw new GcodeParseError(
            line,
            'Accumulated coordinate or extrusion value is nonfinite.',
          );
        }
        const extrusion = nextExtrusion > extrusionPosition;
        point = to;
        extrusionPosition = nextExtrusion;
        if (hasMotion(values)) {
          extents = include(extents, from);
          extents = include(extents, to);
          if (extrusion) {
            extrusionExtents = include(include(extrusionExtents, from), to);
          }
          const path = { from, to, extrusion, line };
          evidence(
            'linear moves',
            GcodeFindingKind.State,
            'Retained linear move in the disclosed model; positive E advance classifies extrusion.',
            'Compare mode state and scoped bounds. Only retained moves map to a preview layer.',
            line,
            rawLine,
          );
          const paths = layers.get(to.z) ?? [];
          if (extrusionMoves + travelMoves < GCODE_MAX_PATHS) {
            paths.push(path);
            layers.set(to.z, paths);
          } else {
            previewTruncated = true;
          }
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
  if (previewTruncated) {
    limitations.add(
      `Preview retains the first ${GCODE_MAX_PATHS.toLocaleString()} moves; extents include all reviewed linear moves.`,
    );
  }
  const prusa =
    slicerDeclarations.size === 1 &&
    /^PrusaSlicer\s+2\.9\.6\b/.test(metadata.slicer ?? '');
  const duration =
    prusa &&
    durationDeclarations === 1 &&
    durations.length === 1 &&
    lines.length <= GCODE_MAX_LINES
      ? durations[0]
      : null;
  const material =
    prusa &&
    materialDeclarations === 1 &&
    materials.length === 1 &&
    (tools.size === 0 || (tools.size === 1 && tools.has(0))) &&
    lines.length <= GCODE_MAX_LINES
      ? materials[0]
      : null;
  return {
    version: GCODE_REPORT_VERSION,
    assumptions: [
      'Linear model starts at logical XYZ=0 and E=0, millimetres, absolute XYZ and absolute E until declared otherwise.',
      'M82/M83 are modelled independently; firmware-dependent transitions are disclosed.',
      'Logical file coordinates are not measured machine position. Purge, prime, travel and Z hops are not model dimensions.',
      'Declarations identify file comments, not authenticated slicer authors or measured consumption/time.',
    ],
    findings: [...findings.values()],
    coverage: {
      linear: incomplete ? GcodeCoverage.Incomplete : GcodeCoverage.Recognised,
      extrusion:
        incomplete || extrusionIncomplete
          ? GcodeCoverage.Incomplete
          : GcodeCoverage.Recognised,
      duration: duration ? GcodeCoverage.Recognised : GcodeCoverage.Unavailable,
      material: material ? GcodeCoverage.Recognised : GcodeCoverage.Unavailable,
    },
    counts: {
      supported,
      auxiliary,
      unsupported,
      reviewedLines: Math.min(lines.length, GCODE_MAX_LINES),
      totalLines: lines.length,
    },
    previewTruncated,
    duration,
    material,
    extrusionExtents,
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
  return coordinateMessage(
    report.extents,
    { min: { x: 0, y: 0, z: 0 }, max: volume },
    report.coverage.linear,
  );
}

export function coordinateMessage(
  extents: GcodeExtents | null,
  bounds: GcodeExtents,
  coverage: GcodeCoverage,
): string | null {
  if (
    !extents ||
    !['x', 'y', 'z'].every((key) => {
      const axis = key as keyof GcodePoint;
      return (
        Number.isFinite(bounds.min[axis]) &&
        Number.isFinite(bounds.max[axis]) &&
        bounds.min[axis] < bounds.max[axis]
      );
    })
  ) {
    return null;
  }
  const outside = (['x', 'y', 'z'] as const).some(
    (axis) =>
      extents.min[axis] < bounds.min[axis] ||
      extents.max[axis] > bounds.max[axis],
  );
  return `${outside ? 'Observed paths extend outside' : 'Observed paths lie within'} the entered coordinate bounds. ${coverage === GcodeCoverage.Recognised ? 'Recognised linear paths only.' : 'Incomplete coverage; this is not a complete fit result.'} No collision or machine compatibility conclusion.`;
}

export function dimensions(extents: GcodeExtents): GcodePoint {
  return {
    x: extents.max.x - extents.min.x,
    y: extents.max.y - extents.min.y,
    z: extents.max.z - extents.min.z,
  };
}

export function layerMoveCounts(layer: GcodeLayer): GcodeLayerMoveCounts {
  return layer.paths.reduce<GcodeLayerMoveCounts>(
    (moves, path) =>
      path.extrusion
        ? { ...moves, extrusion: moves.extrusion + 1 }
        : { ...moves, travel: moves.travel + 1 },
    { extrusion: 0, travel: 0 },
  );
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
      `Unsupported or malformed parameter "${remainder.slice(0, GCODE_EXCERPT_LENGTH)}".`,
    );
  }
  for (const match of tokens) {
    const key = match[1].toLowerCase();
    const number = Number(match[2]);
    if (!Number.isFinite(number)) {
      throw new GcodeParseError(line, `Invalid ${match[1]} value.`);
    }
    if (!Number.isFinite(number * factor)) {
      throw new GcodeParseError(line, 'Converted value is nonfinite.');
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
  source: string,
): void {
  if (value !== undefined) {
    if (targets.length < GCODE_MAX_FINDINGS) {
      targets.push({
        value,
        waiting,
        line,
        excerpt: source.slice(0, GCODE_EXCERPT_LENGTH),
      });
    } else if (value > targets[targets.length - 1].value) {
      // Retain the maximum after the initial sample, so review limits cannot
      // miss a later high target just because evidence retention is bounded.
      targets[targets.length - 1] = {
        value,
        waiting,
        line,
        excerpt: source.slice(0, GCODE_EXCERPT_LENGTH),
      };
    }
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
    metadata.slicer = slicer[1].trim().slice(0, GCODE_EXCERPT_LENGTH);
  }
  const time =
    /^(?:estimated printing time(?: \([^)]*\))?|print time|time)\s*(?:=|:)\s*(.+)$/i.exec(
      value,
    );
  if (time) {
    metadata.printTime = time[1].trim().slice(0, GCODE_EXCERPT_LENGTH);
  }
  const layer = /^(?:layer_count|layer count)\s*(?:=|:)\s*(\d+)$/i.exec(value);
  if (layer) {
    const count = Number(layer[1]);
    if (Number.isSafeInteger(count)) {
      metadata.declaredLayers = count;
    }
  }
  const filament =
    /^(?:filament used|filament length|filament_volume|filament used \[g\])\s*(?:=|:)\s*(.+)$/i.exec(
      value,
    );
  if (filament) {
    if (metadata.filament.length < 16) {
      metadata.filament.push(filament[1].trim().slice(0, GCODE_EXCERPT_LENGTH));
    }
  }
}
