export const PlannerKind = {
  Spool: 'spool',
  Wall: 'wall',
  Flow: 'flow',
  Finish: 'finish',
} as const;
export type PlannerKind = (typeof PlannerKind)[keyof typeof PlannerKind];
