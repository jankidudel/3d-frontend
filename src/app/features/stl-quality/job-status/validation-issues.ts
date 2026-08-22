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
      'Gaps can make slicing ambiguous and can lead to unreliable volume calculations or missing surfaces in a print.',
    nextSteps: [
      'Try your slicer’s repair function or a mesh tool such as Blender or Meshmixer.',
      'Inspect the repaired model for unwanted holes or changed surfaces.',
    ],
  },
  [ValidationIssueCode.NonManifoldEdge]: {
    code: ValidationIssueCode.NonManifoldEdge,
    title: 'Fix non-manifold edges',
    meaning:
      'More than two faces share an edge, or the mesh geometry is ambiguous.',
    whyItMatters:
      'Ambiguous geometry can confuse slicers and make the model’s inside and outside unclear.',
    nextSteps: [
      'Remove overlapping or internal geometry in a modelling or mesh-repair tool.',
      'Repair the mesh, then inspect the result before using it.',
    ],
  },
  [ValidationIssueCode.DegenerateTriangle]: {
    code: ValidationIssueCode.DegenerateTriangle,
    title: 'Clean degenerate triangles',
    meaning: 'The mesh contains zero-area or nearly zero-area faces.',
    whyItMatters:
      'These faces can cause mesh-processing errors or unreliable slicing and volume calculations.',
    nextSteps: [
      'Use mesh-cleanup tools to remove degenerate faces.',
      'Clean and re-export the model from its source when possible.',
    ],
  },
  [ValidationIssueCode.DuplicateTriangle]: {
    code: ValidationIssueCode.DuplicateTriangle,
    title: 'Remove duplicate triangles',
    meaning: 'Duplicate or overlapping faces exist in the mesh.',
    whyItMatters:
      'Overlapping faces can create ambiguous surfaces for a slicer and distort mesh analysis.',
    nextSteps: [
      'Remove duplicate faces with a mesh-cleanup tool.',
      'If possible, re-export a cleaned model from the source software.',
    ],
  },
  [ValidationIssueCode.InconsistentOrientation]: {
    code: ValidationIssueCode.InconsistentOrientation,
    title: 'Repair face orientation',
    meaning: 'Some face normals point in the wrong direction.',
    whyItMatters:
      'Incorrect normals can make inside and outside surfaces unclear to slicers and volume calculations.',
    nextSteps: [
      'Recalculate or repair normals in a modelling or mesh-repair tool.',
      'Inspect the corrected model, especially around the affected surfaces.',
    ],
  },
  [ValidationIssueCode.InvalidCoordinates]: {
    code: ValidationIssueCode.InvalidCoordinates,
    title: 'Re-export invalid geometry',
    meaning: 'The STL contains unusable numeric geometry.',
    whyItMatters:
      'Invalid coordinates make geometry analysis unreliable and can prevent a slicer from processing the file.',
    nextSteps: [
      'Re-export the model from the original CAD or modelling software.',
      'Do not rely on the current file; inspect the newly exported model and run this check again.',
    ],
  },
  [ValidationIssueCode.MultipleDisconnectedShells]: {
    code: ValidationIssueCode.MultipleDisconnectedShells,
    title: 'Check separate components',
    meaning:
      'The STL contains separate mesh components. This can be intentional, such as separate printable parts or floating details.',
    whyItMatters:
      'Unexpected components can be missed, misplaced or printed separately by a slicer.',
    nextSteps: [
      'Inspect the model in a slicer or 3D viewer to confirm every part is expected and correctly positioned.',
      'Keep intentional separate parts; do not delete or repair them automatically.',
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
): IssueGuidance[] {
  const seen = new Set<RecognisedIssueCode>();
  return issues.flatMap((issue) => {
    const recognisedCode = recognisedIssueCode(issue.code);
    if (!recognisedCode || seen.has(recognisedCode)) {
      return [];
    }
    seen.add(recognisedCode);
    return [ISSUE_GUIDANCE[recognisedCode]];
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
