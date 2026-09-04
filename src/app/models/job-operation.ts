export const JobOperation = {
  SafeStlRepair: 'safe_stl_repair',
  ThreeMfQualityChecker: '3mf_quality_checker',
} as const;

export type JobOperation = (typeof JobOperation)[keyof typeof JobOperation];
