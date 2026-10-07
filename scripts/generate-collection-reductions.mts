import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  readStl,
  simplify,
  writeBinaryStl,
} from '../src/app/features/stl-reducer/stl-reducer.ts';
// Run generate-collection-examples.py first. No physical testing is implied.
const directory = resolve(
  import.meta.dirname,
  '../public/examples/collection-review',
);
const original = await readStl(
  new File(
    [await readFile(resolve(directory, 'detail-coupon.stl'))],
    'detail-coupon.stl',
  ),
);
for (const percent of [75, 50]) {
  const reduced = await simplify(original, percent);
  await writeFile(
    resolve(directory, `detail-coupon-${percent}.stl`),
    new Uint8Array(await writeBinaryStl(reduced).arrayBuffer()),
  );
}
