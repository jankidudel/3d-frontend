import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();

describe('frontend deployment workflow', () => {
  it('preserves historical hashed assets and revalidates only mutable documents', async () => {
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
    expect(deploymentScript).toContain(
      'aws cloudfront wait invalidation-completed',
    );
    expect(deploymentScript.indexOf('immutable_cache_control')).toBeLessThan(
      deploymentScript.indexOf('mutable_cache_control'),
    );
    expect(main).not.toContain('window.location.reload');
  });
});
