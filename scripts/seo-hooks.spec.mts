import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { outgoingCommits } from './seo-hooks.mts';

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
