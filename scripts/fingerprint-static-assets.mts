import { createHash } from 'node:crypto';
import { access, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createModulePreloadCompleter } from './module-preloads.mts';

const outputDirectory = resolve(
  import.meta.dirname,
  '..',
  'dist',
  '3d-frontend',
  'browser',
);
const entryAssetNames = ['main.js', 'styles.css'] as const;
const completeModulePreloads = createModulePreloadCompleter((filename) =>
  readFile(join(outputDirectory, filename), 'utf8'),
);

const replacements = new Map<string, string>();
for (const entryAssetName of entryAssetNames) {
  const sourcePath = join(outputDirectory, entryAssetName);
  if (!(await fileExists(sourcePath))) {
    continue;
  }
  const contents = await readFile(sourcePath);
  const extension = extname(entryAssetName);
  const basename = entryAssetName.slice(0, -extension.length);
  const fingerprint = createHash('sha256')
    .update(contents)
    .digest('hex')
    .slice(0, 16);
  const fingerprintedName = `${basename}.${fingerprint}${extension}`;

  await rename(sourcePath, join(outputDirectory, fingerprintedName));
  replacements.set(entryAssetName, fingerprintedName);
}

if (replacements.size > 0) {
  console.log(
    `Fingerprinted static entry assets: ${[...replacements.values()].join(', ')}.`,
  );
} else {
  console.log('Static entry assets are already fingerprinted.');
}
await rewriteHtmlReferences(outputDirectory);

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function rewriteHtmlReferences(directory: string): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return rewriteHtmlReferences(path);
      }
      if (!entry.isFile() || !entry.name.endsWith('.html')) {
        return;
      }

      const html = await readFile(path, 'utf8');
      const fingerprintedHtml = [...replacements].reduce(
        (result, [sourceName, fingerprintedName]) =>
          result.replaceAll(sourceName, fingerprintedName),
        html,
      );
      const optimizedHtml = await completeModulePreloads(fingerprintedHtml);
      if (optimizedHtml !== html) {
        await writeFile(path, optimizedHtml);
      }
    }),
  );
}
