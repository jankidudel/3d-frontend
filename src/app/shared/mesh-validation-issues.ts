import { ModelFileFormat } from '../core/formats/model-file-format';

export const ValidationIssueCode = {
  OpenEdge: 'open_edge',
  NonManifoldEdge: 'non_manifold_edge',
  DegenerateTriangle: 'degenerate_triangle',
  DuplicateTriangle: 'duplicate_triangle',
  InconsistentOrientation: 'inconsistent_orientation',
  InvalidCoordinates: 'invalid_coordinates',
  MultipleDisconnectedShells: 'multiple_disconnected_shells',
} as const;

export type RecognisedIssueCode =
  (typeof ValidationIssueCode)[keyof typeof ValidationIssueCode];

export interface DisplayIssue {
  readonly code: string;
  readonly label: string;
  readonly detail: string;
  readonly severity: string;
}

export interface IssueGuidance {
  readonly code: RecognisedIssueCode;
  readonly title: string;
  readonly meaning: string;
  readonly whyItMatters: string;
  readonly nextSteps: readonly string[];
}

export interface IssueGuidanceCard extends IssueGuidance {
  readonly found: string;
  readonly severityLabel: 'Needs attention' | 'Review recommended';
  readonly learnMore: readonly {
    readonly href: string;
    readonly text: string;
  }[];
}

export type GuidanceFormat = ModelFileFormat;

type GuidanceLink = {
  readonly href: string;
  readonly text: string;
};

const ISSUE_LABELS: Record<RecognisedIssueCode, string> = {
  [ValidationIssueCode.OpenEdge]: 'Open edges',
  [ValidationIssueCode.NonManifoldEdge]: 'Non-manifold edges',
  [ValidationIssueCode.DegenerateTriangle]: 'Degenerate triangles',
  [ValidationIssueCode.DuplicateTriangle]: 'Duplicate triangles',
  [ValidationIssueCode.InconsistentOrientation]: 'Inconsistent orientation',
  [ValidationIssueCode.InvalidCoordinates]: 'Invalid coordinates',
  [ValidationIssueCode.MultipleDisconnectedShells]:
    'Multiple disconnected shells',
};

const ISSUE_GUIDANCE: Record<RecognisedIssueCode, IssueGuidance> = {
  [ValidationIssueCode.OpenEdge]: {
    code: ValidationIssueCode.OpenEdge,
    title: 'Fix open edges',
    meaning: 'The mesh has gaps, so it is not fully watertight.',
    whyItMatters:
      'This may affect slicing or printing because the model is not a closed solid.',
    nextSteps: [
      'Repair holes in your source CAD application, Blender, Microsoft 3D Builder, or a slicer repair workflow where available.',
      'Save a copy under a new filename, then run this checker again.',
    ],
  },
  [ValidationIssueCode.NonManifoldEdge]: {
    code: ValidationIssueCode.NonManifoldEdge,
    title: 'Fix non-manifold edges',
    meaning:
      'More than two faces share an edge, or the mesh geometry is ambiguous.',
    whyItMatters:
      'This may affect slicing or printing because the model inside and outside can be unclear.',
    nextSteps: [
      'Inspect overlapping or internal faces and problematic joins in your source or repair application.',
      'Repair the mesh, save a copy, then run this checker again.',
    ],
  },
  [ValidationIssueCode.DegenerateTriangle]: {
    code: ValidationIssueCode.DegenerateTriangle,
    title: 'Clean degenerate triangles',
    meaning: 'The mesh contains zero-area or nearly zero-area faces.',
    whyItMatters: 'These faces may affect slicing or printing.',
    nextSteps: [
      'Remove or clean zero-area faces in the source or repair application.',
      'Export under a new filename, then run this checker again.',
    ],
  },
  [ValidationIssueCode.DuplicateTriangle]: {
    code: ValidationIssueCode.DuplicateTriangle,
    title: 'Remove duplicate triangles',
    meaning: 'Duplicate or overlapping faces exist in the mesh.',
    whyItMatters:
      'Duplicate faces may affect slicing or printing by creating ambiguous surfaces.',
    nextSteps: [
      'Remove duplicate faces or clean the mesh in the source or repair application.',
      'Run this checker again before slicing.',
    ],
  },
  [ValidationIssueCode.InconsistentOrientation]: {
    code: ValidationIssueCode.InconsistentOrientation,
    title: 'Repair face orientation',
    meaning: 'Some face normals point in the wrong direction.',
    whyItMatters:
      'Incorrect normals may affect slicing or printing by making surface direction unclear.',
    nextSteps: [
      'Recalculate normals after cleaning the mesh.',
      'Inspect the result in the slicer before printing.',
    ],
  },
  [ValidationIssueCode.InvalidCoordinates]: {
    code: ValidationIssueCode.InvalidCoordinates,
    title: 'Re-export invalid geometry',
    meaning: 'The STL contains unusable numeric geometry.',
    whyItMatters:
      'Invalid numeric geometry may prevent a slicer from processing the file.',
    nextSteps: [
      'Re-export from the source design application.',
      'Do not rely on a slicer to correct invalid numeric geometry. Run this checker again on the new export.',
    ],
  },
  [ValidationIssueCode.MultipleDisconnectedShells]: {
    code: ValidationIssueCode.MultipleDisconnectedShells,
    title: 'Check separate components',
    meaning:
      'The STL contains separate mesh components. This can be intentional, such as separate printable parts or floating details.',
    whyItMatters: 'Unexpected components may affect slicing or printing.',
    nextSteps: [
      'Confirm whether the separate parts are intentional.',
      'If not, join or repair them in the source application.',
    ],
  },
};

const FORMAT_GUIDANCE_LINKS: Readonly<
  Record<
    GuidanceFormat,
    Partial<Record<RecognisedIssueCode, readonly GuidanceLink[]>>
  >
> = {
  [ModelFileFormat.Stl]: {
    [ValidationIssueCode.OpenEdge]: [
      {
        href: PublicRouteUrl.WatertightChecker,
        text: 'STL Watertight Checker',
      },
      { href: PublicRouteUrl.WatertightStlGuide, text: 'Watertight STL guide' },
    ],
    [ValidationIssueCode.NonManifoldEdge]: [
      { href: PublicRouteUrl.ManifoldChecker, text: 'STL Manifold Checker' },
      {
        href: PublicRouteUrl.FixNonManifoldStlGuide,
        text: 'Non-manifold STL guide',
      },
    ],
  },
  [ModelFileFormat.ThreeMf]: {
    [ValidationIssueCode.OpenEdge]: [
      {
        href: PublicRouteUrl.ThreeMfWatertightChecker,
        text: '3MF Watertight Checker',
      },
    ],
    [ValidationIssueCode.NonManifoldEdge]: [
      {
        href: PublicRouteUrl.ThreeMfManifoldChecker,
        text: '3MF Manifold Checker',
      },
    ],
  },
};

export function normalizeValidationIssues(value: unknown): DisplayIssue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((issue) => {
    if (typeof issue === 'string') {
      return displayIssue(issue, '', 'error');
    }
    const record = asRecord(issue);
    if (!record) {
      return {
        code: '',
        label: 'Validation issue',
        detail: String(issue),
        severity: 'error',
      };
    }
    const code = firstString(record, ['type', 'code', 'issueType', 'name']);
    const message = firstString(record, ['message', 'description', 'detail']);
    const count = record['count'];
    const severity = firstString(record, ['severity']) || 'error';
    const countText =
      typeof count === 'number' && Number.isFinite(count)
        ? `${new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(count)} found`
        : '';
    return displayIssue(
      code || 'Validation issue',
      [countText, message].filter(Boolean).join(' - '),
      severity,
    );
  });
}

export function guidanceForIssues(
  issues: readonly DisplayIssue[],
  format: GuidanceFormat = ModelFileFormat.Stl,
): IssueGuidanceCard[] {
  const seen = new Set<RecognisedIssueCode>();
  return issues.flatMap((issue) => {
    const recognisedCode = recognisedIssueCode(issue.code);
    if (!recognisedCode || seen.has(recognisedCode)) {
      return [];
    }
    seen.add(recognisedCode);
    const guidance = ISSUE_GUIDANCE[recognisedCode];
    return [
      {
        ...guidance,
        found: issue.detail || `${issue.label} found`,
        severityLabel:
          recognisedCode === ValidationIssueCode.OpenEdge ||
          recognisedCode === ValidationIssueCode.NonManifoldEdge ||
          recognisedCode === ValidationIssueCode.InvalidCoordinates ||
          recognisedCode === ValidationIssueCode.DegenerateTriangle
            ? 'Needs attention'
            : 'Review recommended',
        learnMore: FORMAT_GUIDANCE_LINKS[format][recognisedCode] ?? [],
      },
    ];
  });
}

function displayIssue(
  code: string,
  detail: string,
  severity: string,
): DisplayIssue {
  const trimmedCode = code.trim();
  const recognisedCode = recognisedIssueCode(trimmedCode);
  return {
    code: trimmedCode,
    label:
      (recognisedCode && ISSUE_LABELS[recognisedCode]) ??
      trimmedCode
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^./, (letter) => letter.toUpperCase()),
    detail,
    severity,
  };
}

function recognisedIssueCode(code: string): RecognisedIssueCode | null {
  return (
    Object.values(ValidationIssueCode).find(
      (recognisedCode) => recognisedCode === code,
    ) ?? null
  );
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

import { PublicRouteUrl } from '../core/seo/public-routes';
