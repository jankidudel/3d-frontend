export const JobOperation = {
  SafeStlRepair: 'safe_stl_repair',
} as const;

export type JobOperation = (typeof JobOperation)[keyof typeof JobOperation];
