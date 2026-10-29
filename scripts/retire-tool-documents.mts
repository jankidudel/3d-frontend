import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { retiredRoutes, retirementDocuments } from './retired-routes.mts';

export function retiredToolDocuments(buildDirectory: string): string[] {
  const keys = retirementDocuments();
  for (const policy of retiredRoutes) {
    if (
      !existsSync(
        resolve(buildDirectory, '.' + policy.currentPath, 'index.html'),
      )
    ) {
      throw new Error(
        `Replacement tool document missing: ${policy.currentPath}`,
      );
    }
  }
  for (const key of keys) {
    if (existsSync(resolve(buildDirectory, key))) {
      throw new Error(`Retired tool document remains in build: ${key}`);
    }
  }
  return keys;
}

export function retireToolDocuments(
  buildDirectory: string,
  bucket: string,
  run: (args: string[]) => string = (args) =>
    execFileSync('aws', args, { encoding: 'utf8' }),
): void {
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) {
    throw new Error('Invalid frontend bucket name');
  }
  const keys = retiredToolDocuments(buildDirectory);
  // Check the uploaded replacements before deleting anything. This also fails
  // safely if the workflow selected the wrong bucket or an upload was partial.
  for (const policy of retiredRoutes) {
    run([
      's3api',
      'head-object',
      '--bucket',
      bucket,
      '--key',
      policy.currentPath.slice(1) + '/index.html',
    ]);
  }
  console.log(`Removing ${keys.length} retired tool HTML keys from ${bucket}:`);
  console.log(keys.join('\n'));
  const output = run([
    's3api',
    'delete-objects',
    '--bucket',
    bucket,
    '--output',
    'json',
    '--delete',
    JSON.stringify({ Objects: keys.map((Key) => ({ Key })), Quiet: true }),
  ]);
  // S3 quiet mode can return an empty response when every deletion succeeds.
  // Nonzero CLI exits still throw, and nonempty responses retain per-key errors.
  let response: { Errors?: unknown[] } = {};
  if (output.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(output);
    } catch {
      throw new Error(
        'Invalid retirement deletion response: truncated or non-JSON output',
      );
    }
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed) ||
      ('Errors' in parsed && !Array.isArray(parsed.Errors))
    ) {
      throw new Error(
        'Invalid retirement deletion response: expected a JSON object with optional Errors array',
      );
    }
    response = parsed;
  }
  if (response.Errors?.length) {
    throw new Error(
      `Retired tool cleanup failed: ${JSON.stringify(response.Errors)}`,
    );
  }
}

export async function verifyRetiredTools(
  buildDirectory: string,
  request: typeof fetch = fetch,
): Promise<void> {
  const keys = retiredToolDocuments(buildDirectory).filter((key) =>
    key.endsWith('/index.html'),
  );
  for (let index = 0; index < keys.length; index += 4) {
    await Promise.all(
      keys.slice(index, index + 4).map(async (key) => {
        const url = `https://www.inspectmesh.com/${key.replace('/index.html', '')}`;
        const response = await request(url, {
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(15000),
        });
        if (response.status !== 404 && response.status !== 410) {
          throw new Error(
            `Retired tool URL must return 404/410: ${url} returned ${response.status}`,
          );
        }
      }),
    );
  }
  console.log(`Verified ${keys.length} retired tool URLs return 404/410.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [buildDirectory, bucket] = process.argv.slice(2);
  if (!buildDirectory || !bucket) {
    throw new Error(
      'Usage: retire-tool-documents.mts BUILD_DIRECTORY FRONTEND_BUCKET',
    );
  }
  retireToolDocuments(buildDirectory, bucket);
  await verifyRetiredTools(buildDirectory);
}
