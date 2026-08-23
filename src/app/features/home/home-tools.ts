export interface HomeTool {
  readonly cta: string;
  readonly description: string;
  readonly icon: string;
  readonly route: string;
  readonly title: string;
}

export interface HomeToolGroup {
  readonly id: string;
  readonly title: string;
  readonly tools: readonly HomeTool[];
}

export const HOME_TOOL_GROUPS: readonly HomeToolGroup[] = [
  {
    id: 'stl-tools',
    title: 'STL tools',
    tools: [
      {
        icon: '✓',
        title: 'STL Quality Check',
        description:
          'Find common mesh problems before printing, including open edges, non-manifold geometry, duplicate triangles and orientation issues.',
        route: '/stl-quality-check',
        cta: 'Check an STL file',
      },
      {
        icon: '⌁',
        title: 'STL Manifold Checker',
        description:
          'Check whether an STL is closed and manifold, with clear counts for open edges, non-manifold edges and separate shells.',
        route: '/stl-manifold-checker',
        cta: 'Check STL topology',
      },
      {
        icon: '↔',
        title: 'STL Dimensions Checker',
        description:
          'Measure an STL, convert units, calculate proportional scaling and check whether it fits your printer.',
        route: '/stl-dimensions-checker',
        cta: 'Measure an STL file',
      },
      {
        icon: '◈',
        title: 'STL Volume Calculator',
        description:
          'Calculate your model’s volume, convert units and estimate approximate material weight.',
        route: '/stl-volume-calculator',
        cta: 'Calculate STL volume',
      },
    ],
  },
];
