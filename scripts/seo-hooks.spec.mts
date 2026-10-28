import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  outgoingCommits,
  pushVerificationScripts,
  verifyPushSnapshot,
} from './seo-hooks.mts';

const zero = '0'.repeat(40);
describe('Git SEO snapshot contracts', () => {
  it('validates actual distinct outgoing commits, new/force refs and commit tags; skips deletions', () => {
    const resolveCommit = (sha: string) =>
      sha === 'tag-object' ? 'tag-commit' : sha;
    expect(
      outgoingCommits(
        `refs/heads/noncurrent sha-A refs/heads/noncurrent old\nrefs/heads/new sha-B refs/heads/new ${zero}\nrefs/tags/release tag-object refs/tags/release ${zero}\nrefs/heads/duplicate sha-A refs/heads/duplicate other\nrefs/heads/deleted ${zero} refs/heads/deleted old`,
        resolveCommit,
      ),
    ).toEqual(['sha-A', 'sha-B', 'tag-commit']);
    expect(() => outgoingCommits('invalid', resolveCommit)).toThrow('Invalid');
    expect(() =>
      outgoingCommits('refs/notes/n a refs/notes/n b', resolveCommit),
    ).toThrow('Unsupported');
  });
  it.each(['HEAD', 'HEAD~1', 'main', '0123456789abcdef'])(
    'accepts Git revision source %s and audits the supplied outgoing SHA',
    (localRef) => {
      const resolved: string[] = [];
      expect(
        outgoingCommits(
          `${localRef} outgoing-sha refs/heads/main old-sha`,
          (sha) => {
            resolved.push(sha);
            return 'resolved-outgoing-commit';
          },
        ),
      ).toEqual(['resolved-outgoing-commit']);
      expect(resolved).toEqual(['outgoing-sha']);
    },
  );
  it('checks the remote destination even when the local source is a normal branch', () => {
    expect(() =>
      outgoingCommits(
        'refs/heads/main outgoing-sha refs/notes/custom old-sha',
        () => {
          throw new Error(
            'Must reject unsupported destination before resolving',
          );
        },
      ),
    ).toThrow('Unsupported outgoing destination: refs/notes/custom');
    expect(
      outgoingCommits(`(delete) ${zero} refs/heads/main old-sha`, () => {
        throw new Error('Deleted refs have no outgoing commit');
      }),
    ).toEqual([]);
  });
  it('checks outgoing source without requiring Chrome or certifying deployment', async () => {
    const pkg = JSON.parse(await readFile('package.json', 'utf8'));
    const commands: string[][] = [];
    verifyPushSnapshot(pkg.scripts, (args) => commands.push(args));
    expect(commands).toEqual([
      ['run', 'format:check'],
      ['run', 'lint'],
      ['run', 'typecheck:scripts'],
      ['run', 'test'],
      ['run', 'build'],
      ['run', 'check:internal-links'],
      ['run', 'seo:audit'],
    ]);
    expect(pkg.scripts['verify:push']).toBe(
      pushVerificationScripts.map((script) => `npm run ${script}`).join(' && '),
    );
    expect(pkg.scripts.verify).toBe(
      'npm run verify:push && npm run seo:render && npm run seo:artifact:seal',
    );
    // The commit originally blocked by the hook has no verify:push command.
    // It must still receive all source checks through its actual script names.
    const legacy = { ...pkg.scripts };
    delete legacy['verify:push'];
    expect(() => verifyPushSnapshot(legacy, () => undefined)).not.toThrow();
  });

  it('rejects incomplete push contracts before running any command', () => {
    const commands: string[][] = [];
    expect(() =>
      verifyPushSnapshot({ 'format:check': 'prettier --check .' }, (args) =>
        commands.push(args),
      ),
    ).toThrow('missing the required push check: lint');
    expect(commands).toEqual([]);
  });

  it('reads a partial staged blob from an isolated index without touching working bytes or the real index', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'inspectmesh-index-'));
    const realIndex = execFileSync(
      'git',
      ['rev-parse', '--git-path', 'index'],
      { encoding: 'utf8' },
    ).trim();
    const beforeIndex = await readFile(realIndex);
    const beforeReadme = await readFile('README.md');
    try {
      const objects = resolve(directory, 'objects');
      await mkdir(objects);
      const gitDirectory = execFileSync(
        'git',
        ['rev-parse', '--absolute-git-dir'],
        { encoding: 'utf8' },
      ).trim();
      const env = {
        ...process.env,
        GIT_DIR: gitDirectory,
        GIT_INDEX_FILE: resolve(directory, 'index'),
        GIT_OBJECT_DIRECTORY: objects,
        GIT_ALTERNATE_OBJECT_DIRECTORIES: resolve(gitDirectory, 'objects'),
      };
      execFileSync('git', ['read-tree', 'HEAD'], { env });
      const staged = Buffer.from('staged bytes with a deliberate SEO defect\n');
      const sha = execFileSync('git', ['hash-object', '-w', '--stdin'], {
        env,
        input: staged,
        encoding: 'utf8',
      }).trim();
      execFileSync(
        'git',
        [
          'update-index',
          '--add',
          '--cacheinfo',
          `100644,${sha},staged file with spaces.html`,
        ],
        { env },
      );
      const snapshot = resolve(directory, 'snapshot');
      await mkdir(snapshot);
      execFileSync(
        'git',
        ['checkout-index', '--all', `--prefix=${snapshot}/`],
        { env },
      );
      await writeFile(
        resolve(directory, 'staged file with spaces.html'),
        'unstaged good bytes',
      );
      expect(
        await readFile(resolve(snapshot, 'staged file with spaces.html')),
      ).toEqual(staged);
      expect(await readFile(realIndex)).toEqual(beforeIndex);
      expect(await readFile('README.md')).toEqual(beforeReadme);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
