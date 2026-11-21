import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const { scripts } = JSON.parse(await readFile('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

function commands(script: string): string[] {
  return scripts[script].split(' && ').flatMap((command) => {
    const nested = /^npm run (\S+)$/.exec(command);
    return nested ? commands(nested[1]) : [command];
  });
}

describe('release verification contract', () => {
  it('runs each expensive operation once and keeps every release gate', () => {
    const release = commands('verify');
    expect(release).toEqual([
      'node --experimental-strip-types scripts/generate-guides.mts',
      'prettier --check .',
      'eslint .',
      'tsc --project tsconfig.scripts.json',
      'tsc --project tsconfig.collection-examples.json',
      'ng test --watch=false',
      'vitest run scripts/*.spec.mts',
      'node --experimental-strip-types scripts/generate-build-info.mts',
      'node --experimental-strip-types scripts/generate-seo-assets.mts production',
      'ng build',
      'node --experimental-strip-types scripts/fingerprint-static-assets.mts',
      'node --experimental-strip-types scripts/seo-check.mts',
      'node --experimental-strip-types scripts/technical-seo.mts',
      'node --experimental-strip-types scripts/page-js-budget.mts',
      'node --experimental-strip-types scripts/seo-audit.mts',
      'node --experimental-strip-types scripts/seo-browser.mts',
      'node --experimental-strip-types scripts/seo-artifact.mts --seal',
    ]);
    expect(new Set(release).size).toBe(release.length);
    expect(commands('verify:push')).toEqual(release.slice(0, -2));
  });

  it('includes all previously registered script tests in the single test invocation', async () => {
    const registered = [
      ...new Set(
        Object.entries(scripts)
          .filter(
            ([name]) => name.startsWith('test:') && name !== 'test:scripts',
          )
          .flatMap(
            ([, command]) => command.match(/scripts\/[^ ]+\.spec\.mts/g) ?? [],
          ),
      ),
    ];
    const discovered = (await readdir('scripts')).filter((name) =>
      name.endsWith('.spec.mts'),
    );
    expect(registered.length).toBeGreaterThan(0);
    for (const path of registered) {
      expect(discovered).toContain(path.slice('scripts/'.length));
    }
    expect(scripts['test:scripts']).toBe('vitest run scripts/*.spec.mts');
  });

  it('keeps route coverage and internal-link checks in the combined HTML audit', async () => {
    const htmlAudit = await readFile('scripts/technical-seo.mts', 'utf8');
    expect(htmlAudit).toContain('const coverage = auditRouteCoverage(');
    expect(htmlAudit).toContain('validateGeneratedPages(pages)');
    expect(htmlAudit).toContain("entries.kind !== 'urlset'");
    expect(commands('build')).toEqual([
      'node --experimental-strip-types scripts/generate-guides.mts',
      ...commands('build:prepared'),
    ]);
  });
});
