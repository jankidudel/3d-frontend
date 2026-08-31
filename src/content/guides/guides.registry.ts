export const GuideGroupId = {
  General: 'general',
  Stl: 'stl',
  ThreeMf: '3mf',
} as const;

export type GuideGroupId = (typeof GuideGroupId)[keyof typeof GuideGroupId];

export interface GuideRegistryEntry {
  readonly slug: string;
  readonly group: GuideGroupId;
  readonly order: number;
  readonly enabled: boolean;
}

export const guideGroups = {
  [GuideGroupId.General]: {
    label: 'General 3D printing guides',
  },
  [GuideGroupId.Stl]: {
    label: 'STL guides',
  },
  [GuideGroupId.ThreeMf]: {
    label: '3MF guides',
  },
} as const;

export const guideRegistry: readonly GuideRegistryEntry[] = [
  {
    slug: 'how-to-check-if-a-3d-model-fits-your-printer',
    group: GuideGroupId.General,
    order: 10,
    enabled: true,
  },
  {
    slug: 'how-to-check-stl-for-errors',
    group: GuideGroupId.Stl,
    order: 10,
    enabled: true,
  },
  {
    slug: 'how-to-fix-non-manifold-stl',
    group: GuideGroupId.Stl,
    order: 20,
    enabled: true,
  },
  {
    slug: 'how-to-tell-if-an-stl-is-watertight',
    enabled: true,
    group: GuideGroupId.Stl,
    order: 30,
  },
  {
    slug: 'stl-triangle-count-explained',
    group: GuideGroupId.Stl,
    order: 40,
    enabled: true,
  },
  {
    slug: 'why-stl-files-have-no-units',
    group: GuideGroupId.Stl,
    order: 50,
    enabled: true,
  },
  {
    slug: 'how-to-scale-an-stl-file-for-3d-printing',
    group: GuideGroupId.Stl,
    order: 60,
    enabled: true,
  },
  {
    slug: 'how-to-reduce-stl-file-size',
    group: GuideGroupId.Stl,
    order: 70,
    enabled: true,
  },
  {
    slug: 'why-wont-my-stl-file-slice',
    group: GuideGroupId.Stl,
    order: 80,
    enabled: true,
  },
  {
    slug: '3mf-vs-stl',
    group: GuideGroupId.ThreeMf,
    order: 10,
    enabled: true,
  },
  {
    slug: 'how-to-open-a-3mf-file',
    group: GuideGroupId.ThreeMf,
    order: 20,
    enabled: true,
  },
  {
    slug: 'how-to-check-a-3mf-file-for-errors',
    group: GuideGroupId.ThreeMf,
    order: 30,
    enabled: true,
  },
  {
    slug: 'how-to-tell-if-a-3mf-file-is-watertight',
    group: GuideGroupId.ThreeMf,
    order: 40,
    enabled: true,
  },
  {
    slug: 'how-to-calculate-3mf-volume',
    group: GuideGroupId.ThreeMf,
    order: 50,
    enabled: true,
  },
];
