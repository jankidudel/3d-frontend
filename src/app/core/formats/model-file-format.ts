export const ModelFileFormat = {
  Stl: 'stl',
  ThreeMf: '3mf',
} as const;

export type ModelFileFormat =
  (typeof ModelFileFormat)[keyof typeof ModelFileFormat];

export const MODEL_FILE_FORMAT_DETAILS: Readonly<
  Record<
    ModelFileFormat,
    { readonly extension: string; readonly label: string }
  >
> = {
  [ModelFileFormat.Stl]: { extension: '.stl', label: 'STL' },
  [ModelFileFormat.ThreeMf]: { extension: '.3mf', label: '3MF' },
};
