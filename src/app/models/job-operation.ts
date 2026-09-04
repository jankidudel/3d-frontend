export const JobOperation = {
  SafeStlRepair: 'safe_stl_repair',
  SafeThreeMfRepair: 'safe_3mf_repair',
} as const;

export type JobOperation = (typeof JobOperation)[keyof typeof JobOperation];
