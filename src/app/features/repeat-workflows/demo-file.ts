export const DemoAsset = {
  Package: '/examples/english-market-batch/declared-inch-transformed.3mf',
  Arachne: '/examples/english-market-batch/thin-arachne.gcode',
  Classic: '/examples/english-market-batch/thin-classic.gcode',
} as const;
export type DemoAsset = (typeof DemoAsset)[keyof typeof DemoAsset];
export async function ownedDemoFile(path: DemoAsset): Promise<File> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error('The owned example could not be loaded.');
  }
  return new File([await response.blob()], path.split('/').at(-1) ?? 'example');
}
