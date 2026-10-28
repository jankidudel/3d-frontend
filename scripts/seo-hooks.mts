import { execFileSync } from 'node:child_process';
import {
  mkdtemp,
  rm,
  symlink,
  copyFile,
  readFile,
  chmod,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const git = (args: string[], options: Record<string, unknown> = {}) =>
  execFileSync('git', args, { cwd: root, ...options });
const zero = /^0+$/;
export const pushVerificationScripts = [
  'format:check',
  'lint',
  'typecheck:scripts',
  'test',
  'build',
  'check:internal-links',
  'seo:audit',
] as const;

/** Keep push checks independent of browser availability and release certification. */
export function verifyPushSnapshot(
  scripts: Readonly<Record<string, string>>,
  run: (args: string[]) => void,
): void {
  for (const script of pushVerificationScripts) {
    if (!scripts[script]) {
      throw new Error(
        `Outgoing commit is missing the required push check: ${script}`,
      );
    }
  }
  for (const script of pushVerificationScripts) {
    run(['run', script]);
  }
}

export function outgoingCommits(
  input: string,
  resolveCommit: (sha: string) => string,
): string[] {
  const commits = new Set<string>();
  for (const line of input.split('\n').filter(Boolean)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 4) {
      throw new Error(
        'Invalid pre-push ref input; cannot certify outgoing source.',
      );
    }
    const [_localRef, sha, remoteRef] = fields;
    if (zero.test(sha)) {
      continue;
    }
    // Git can supply HEAD, a SHA or another revision expression as the local
    // source. Classify the destination and audit Git's supplied source SHA.
    if (
      !remoteRef.startsWith('refs/heads/') &&
      !remoteRef.startsWith('refs/tags/')
    ) {
      throw new Error(`Unsupported outgoing destination: ${remoteRef}`);
    }
    // Annotated/lightweight commit tags are audited; tree/blob tags fail deliberately.
    commits.add(resolveCommit(sha));
  }
  return [...commits];
}
async function snapshot(commit: string | null, full: boolean) {
  const temporary = await mkdtemp(resolve(tmpdir(), 'inspectmesh-git-audit-'));
  const directory = resolve(temporary, 'source');
  const gitDirectory = git(['rev-parse', '--absolute-git-dir'])
    .toString()
    .trim();
  const indexPath = resolve(temporary, 'index');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(directory);
  const env = {
    ...process.env,
    GIT_DIR: gitDirectory,
    GIT_WORK_TREE: directory,
    GIT_INDEX_FILE: indexPath,
  };
  try {
    if (commit) {
      execFileSync('git', ['read-tree', commit], { cwd: root, env });
    } else {
      const actualIndex = git(['rev-parse', '--git-path', 'index'])
        .toString()
        .trim();
      await copyFile(resolve(root, actualIndex), indexPath);
    }
    // checkout-index reads the copied index and writes only the isolated snapshot.
    execFileSync('git', ['checkout-index', '--all', `--prefix=${directory}/`], {
      cwd: root,
      env,
    });
    const expected = await readFile(resolve(directory, 'package-lock.json'));
    const installed = await readFile(resolve(root, 'package-lock.json'));
    if (!expected.equals(installed)) {
      throw new Error(
        'Snapshot lockfile differs from locally installed source. Install its dependencies in an isolated checkout before pushing; no network install runs inside hooks.',
      );
    }
    await symlink(
      resolve(root, 'node_modules'),
      resolve(directory, 'node_modules'),
      'dir',
    );
    const run = (args: string[]) =>
      execFileSync('npm', args, { cwd: directory, env, stdio: 'inherit' });
    // npm treats the snapshot's linked node_modules as extraneous links. Check
    // the matching installation in its original directory, without dumping the
    // entire transitive dependency tree into every Git push.
    try {
      execFileSync('npm', ['ls', '--depth=0', '--offline', '--json'], {
        cwd: root,
        stdio: 'pipe',
      });
    } catch {
      throw new Error(
        'Installed dependencies do not match the local package manifest. Run npm ls --depth=0 in the frontend repository for details.',
      );
    }
    if (full) {
      const pkg = JSON.parse(
        await readFile(resolve(directory, 'package.json'), 'utf8'),
      );
      if (
        pkg.scripts?.['seo:check'] !== 'npm run verify' ||
        !pkg.scripts?.verify?.includes('seo:artifact:seal')
      ) {
        throw new Error(
          'Outgoing commit does not include the mandatory full SEO gate.',
        );
      }
      verifyPushSnapshot(pkg.scripts, run);
      console.log(
        'Outgoing source checks passed. Browser audit and artifact certification remain mandatory in npm run verify before deployment.',
      );
    } else {
      run(['run', 'generate:guides']);
      run(['run', 'seo:source']);
      run(['run', 'test:technical-seo']);
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
async function install() {
  let configured = '';
  try {
    configured = git(['config', '--get', 'core.hooksPath']).toString().trim();
  } catch {
    // No hooksPath is the normal initial setup state.
  }
  if (configured && configured !== '.githooks') {
    throw new Error(
      `Preserving existing core.hooksPath=${configured}. Combine its hooks with npm run seo:staged and the tracked pre-push hook manually.`,
    );
  }
  const hooks = resolve(
    git(['rev-parse', '--git-path', 'hooks']).toString().trim(),
  );
  for (const name of ['pre-commit', 'pre-push']) {
    try {
      await readFile(resolve(hooks, name));
      if (!configured) {
        throw new Error(
          `Preserving existing ${hooks}/${name}; combine it before installation.`,
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    await chmod(resolve(root, '.githooks', name), 0o755);
  }
  git(['config', '--local', 'core.hooksPath', '.githooks']);
  console.log(
    'Repository-local hooks installed; git config --local --get core.hooksPath = .githooks',
  );
}
async function main() {
  const mode = process.argv[2];
  if (mode === 'install') {
    await install();
  } else if (mode === 'staged') {
    if (git(['ls-files', '--unmerged', '-z']).length) {
      throw new Error(
        'Unmerged index; resolve conflicts before staged validation.',
      );
    }
    if (!git(['diff', '--cached', '--name-only', '-z']).length) {
      return;
    }
    await snapshot(null, false);
  } else if (mode === 'push') {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    const commits = outgoingCommits(Buffer.concat(chunks).toString(), (sha) =>
      git(['rev-parse', '--verify', `${sha}^{commit}`])
        .toString()
        .trim(),
    );
    for (const commit of commits) {
      console.log(
        `Auditing outgoing commit ${commit}; working files remain untouched.`,
      );
      await snapshot(commit, true);
    }
  } else {
    throw new Error('Expected install, staged or push.');
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await main();
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  }
}
