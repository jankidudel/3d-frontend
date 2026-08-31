export const GuideGroupId = {
  General: 'general',
  Stl: 'stl',
  ThreeMf: '3mf',
} as const;

export type GuideGroupId = (typeof GuideGroupId)[keyof typeof GuideGroupId];

export interface GuideRegistryEntry {
  readonly slug: string;
  readonly file: string;
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
    slug: 'how-to-fix-non-manifold-stl',
    file: 'how-to-fix-non-manifold-stl.html',
    group: GuideGroupId.Stl,
    order: 10,
    enabled: true,
  },
  {
    slug: 'how-to-tell-if-an-stl-is-watertight',
    file: 'how-to-tell-if-an-stl-is-watertight.html',
    enabled: true,
    group: GuideGroupId.Stl,
    order: 20,
  },
  {
    slug: 'stl-triangle-count-explained',
    file: 'stl-triangle-count-explained.html',
    group: GuideGroupId.Stl,
    order: 30,
    enabled: true,
  },
  {
    slug: 'why-stl-files-have-no-units',
    file: 'why-stl-files-have-no-units.html',
    group: GuideGroupId.Stl,
    order: 40,
    enabled: true,
  },
];
