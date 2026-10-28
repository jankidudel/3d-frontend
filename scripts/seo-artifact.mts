import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export const outputDirectory = resolve('dist/3d-frontend/browser');
export const reportDirectory = resolve('tmp/seo');
const digest = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');

/** Hash bytes, paths and deletions, including uncommitted implementation; never certify HEAD alone. */
export async function sourceIdentity(root = process.cwd()) {
  const names = [
    ...new Set(
      execFileSync(
        'git',
        ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
        { cwd: root },
      )
        .toString()
        .split('\0')
        .filter(Boolean),
    ),
  ].sort();
  const hash = createHash('sha256');
  for (const name of names) {
    hash.update(name + '\0');
    try {
      hash.update(await readFile(resolve(root, name)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      hash.update('<deleted>');
    }
    hash.update('\0');
  }
  return {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim(),
    sourceSha256: hash.digest('hex'),
    lockfileSha256: digest(await readFile(resolve(root, 'package-lock.json'))),
    node: process.version,
  };
}
export async function artifactFiles(
  directory = outputDirectory,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function walk(folder: string): Promise<void> {
    for (const entry of (await readdir(folder, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const path = resolve(folder, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile()) {
        result[relative(directory, path)] = digest(await readFile(path));
      } else {
        throw new Error(`Unexpected non-file artifact: ${path}`);
      }
    }
  }
  await walk(directory);
  return result;
}
export function artifactHash(files: Record<string, string>) {
  return digest(JSON.stringify(files));
}
export async function sealArtifact() {
  const source = await sourceIdentity();
  const version = JSON.parse(
    await readFile(resolve(outputDirectory, 'version.json'), 'utf8'),
  );
  if (version.sourceSha256 !== source.sourceSha256) {
    throw new Error(
      'R07: source changed since this build; rebuild before certification.',
    );
  }
  const files = await artifactFiles();
  const html = JSON.parse(
    await readFile(resolve(reportDirectory, 'html.json'), 'utf8'),
  );
  const render = JSON.parse(
    await readFile(resolve(reportDirectory, 'render.json'), 'utf8'),
  );
  const sha = artifactHash(files);
  for (const result of [html, render]) {
    if (
      !result.complete ||
      result.findings.some(
        (f: { severity: string }) => f.severity === 'ERROR',
      ) ||
      result.artifactSha256 !== sha ||
      result.sourceSha256 !== source.sourceSha256
    ) {
      throw new Error(
        'R07: required HTML/browser report is incomplete, failed or belongs to another artifact.',
      );
    }
  }
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(
    resolve(reportDirectory, 'verified-artifact.json'),
    JSON.stringify(
      {
        ...source,
        artifactSha256: sha,
        files,
        verifiedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`Verified artifact ${sha} (${Object.keys(files).length} files).`);
}
export async function verifyArtifact(directory = outputDirectory) {
  const prior = JSON.parse(
    await readFile(resolve(reportDirectory, 'verified-artifact.json'), 'utf8'),
  );
  const current = await sourceIdentity();
  if (
    prior.sourceSha256 !== current.sourceSha256 ||
    prior.artifactSha256 !== artifactHash(await artifactFiles(directory))
  ) {
    throw new Error(
      'R07: source/artifact differs from the fully verified release. Run npm run verify.',
    );
  }
  console.log(`Release artifact identity verified: ${prior.artifactSha256}`);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    if (process.argv.includes('--seal')) {
      await sealArtifact();
    } else {
      await verifyArtifact(
        process.argv[2] ? resolve(process.argv[2]) : outputDirectory,
      );
    }
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  }
}
