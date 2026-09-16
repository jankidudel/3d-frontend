import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const runFile = promisify(execFile);

describe('frontend deployment workflow', () => {
  it('requires an explicit environment selection before deploying', async () => {
    const workflow = await readFile(
      join(projectRoot, '.github/workflows/deploy-frontend.yml'),
      'utf8',
    );

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('required: true');
    expect(workflow).not.toMatch(/^  push:/m);
    expect(workflow).not.toContain("github.event_name == 'push'");
  });

  it('preserves historical hashed assets without CloudFront invalidation', async () => {
    const [workflow, deploymentScript, angularConfiguration, main] =
      await Promise.all([
        readFile(
          join(projectRoot, '.github/workflows/deploy-frontend.yml'),
          'utf8',
        ),
        readFile(
          join(projectRoot, '.github/scripts/deploy-frontend.sh'),
          'utf8',
        ),
        readFile(join(projectRoot, 'angular.json'), 'utf8'),
        readFile(join(projectRoot, 'src/main.ts'), 'utf8'),
      ]);

    expect(angularConfiguration).toContain('"outputHashing": "all"');
    expect(workflow).not.toMatch(
      /aws s3 (?:sync|cp)[^\n]*--delete|aws s3api delete-object|cleanup-stale-frontend-assets\.sh/i,
    );
    expect(workflow).toContain('bash .github/scripts/deploy-frontend.sh');
    expect(deploymentScript).toContain('public, max-age=31536000, immutable');
    expect(deploymentScript).toContain('no-cache, max-age=0, must-revalidate');
    expect(deploymentScript).toContain('is_hashed_asset');
    expect(deploymentScript).toContain('[A-Za-z0-9_-]{8,}');
    expect(deploymentScript).not.toContain(
      'aws cloudfront create-invalidation',
    );
    expect(deploymentScript).not.toContain('add_invalidation_paths');
    expect(deploymentScript).toContain('content-addressed by the build');
    expect(deploymentScript).toContain('DEPLOY_MAX_UPLOAD_JOBS');
    expect(deploymentScript).toContain('upload_phase immutable');
    expect(deploymentScript).toContain('upload_phase mutable');
    expect(deploymentScript).toContain('upload_phase documents');
    expect(deploymentScript).toContain('wait_for_upload_slot');
    expect(deploymentScript.indexOf('immutable_cache_control')).toBeLessThan(
      deploymentScript.indexOf('mutable_cache_control'),
    );
    expect(main).not.toContain('window.location.reload');
  });

  it('uploads each cache phase concurrently while keeping documents last', async () => {
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), 'inspectmesh-deploy-'),
    );
    const buildDirectory = join(temporaryDirectory, 'build');
    const executableDirectory = join(temporaryDirectory, 'bin');
    const logPath = join(temporaryDirectory, 'uploads.log');
    await Promise.all([
      mkdir(buildDirectory, { recursive: true }),
      mkdir(executableDirectory, { recursive: true }),
    ]);
    await Promise.all([
      writeFile(join(buildDirectory, 'main-12345678.js'), 'asset'),
      writeFile(join(buildDirectory, 'styles-abcdefgh.css'), 'asset'),
      writeFile(join(buildDirectory, 'manifest.webmanifest'), 'mutable'),
      writeFile(join(buildDirectory, 'index.html'), 'document'),
      writeFile(
        join(executableDirectory, 'aws'),
        `#!/usr/bin/env bash\nprintf '%s %s\\n' "$(basename "$3")" "$6" >> "${logPath}"\nsleep 0.02\n`,
      ),
    ]);
    await chmod(join(executableDirectory, 'aws'), 0o755);

    await runFile(
      'bash',
      [
        '.github/scripts/deploy-frontend.sh',
        buildDirectory,
        'test-bucket',
        'unused-distribution',
      ],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          PATH: `${executableDirectory}:${process.env['PATH']}`,
        },
      },
    );

    const uploads = (await readFile(logPath, 'utf8')).trim().split('\n');
    expect(uploads.slice(0, 2).sort()).toEqual([
      'main-12345678.js public, max-age=31536000, immutable',
      'styles-abcdefgh.css public, max-age=31536000, immutable',
    ]);
    expect(uploads.slice(2)).toEqual([
      'manifest.webmanifest no-cache, max-age=0, must-revalidate',
      'index.html no-cache, max-age=0, must-revalidate',
    ]);
  });
});
