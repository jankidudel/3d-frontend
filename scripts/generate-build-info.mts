import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

function gitCommit(): string {
  const suppliedCommit = process.env['FRONTEND_BUILD_VERSION'];
  if (suppliedCommit) {
    return suppliedCommit;
  }

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return process.env['GITHUB_SHA'] ?? 'unknown';
  }
}

const outputDirectory = new URL('../public/', import.meta.url);
const buildInfo = {
  version: gitCommit().slice(0, 12),
  builtAt: new Date().toISOString(),
};
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  new URL('version.json', outputDirectory),
  `${JSON.stringify(buildInfo, null, 2)}\n`,
);
