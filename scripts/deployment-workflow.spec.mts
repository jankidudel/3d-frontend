import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();

describe('frontend deployment workflow', () => {
  it('preserves historical hashed assets and revalidates only mutable documents', async () => {
    const [workflow, angularConfiguration, main] = await Promise.all([
      readFile(
        join(projectRoot, '.github/workflows/deploy-frontend.yml'),
        'utf8',
      ),
      readFile(join(projectRoot, 'angular.json'), 'utf8'),
      readFile(join(projectRoot, 'src/main.ts'), 'utf8'),
    ]);

    expect(angularConfiguration).toContain('"outputHashing": "all"');
    expect(workflow).not.toMatch(
      /aws s3 (?:sync|cp)[^\n]*--delete|aws s3api delete-object|cleanup-stale-frontend-assets\.sh/i,
    );
    expect(workflow).toContain('public, max-age=31536000, immutable');
    expect(workflow).toContain('aws s3 sync dist/3d-frontend/browser');
    expect(workflow).toContain('--size-only');
    expect(workflow).toContain('no-cache, max-age=0, must-revalidate');
    expect(workflow).toContain("--paths '/' '/index.html' '/*/index.html'");
    expect(workflow).not.toContain("--paths '/*'");
    expect(workflow).toContain('aws cloudfront wait invalidation-completed');
    expect(workflow.indexOf('Upload immutable hashed assets')).toBeLessThan(
      workflow.indexOf('Upload mutable documents and public files'),
    );
    expect(
      workflow.indexOf('Upload mutable documents and public files'),
    ).toBeLessThan(workflow.indexOf('Invalidate mutable frontend documents'));
    expect(main).not.toContain('window.location.reload');
  });
});
