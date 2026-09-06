import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const toolPageTemplates = [
  'src/app/features/converters/local-converter-page.html',
  'src/app/features/print-cost/print-cost-page.html',
  'src/app/features/stl-dimensions/stl-dimensions-page.html',
  'src/app/features/stl-manifold/stl-manifold-page.html',
  'src/app/features/stl-quality/stl-quality-page/stl-quality-page.html',
  'src/app/features/stl-repair/stl-repair-page.html',
  'src/app/features/stl-splitter/stl-splitter-page.html',
  'src/app/features/stl-triangle/stl-triangle-page.html',
  'src/app/features/stl-viewer/stl-viewer-page.html',
  'src/app/features/stl-volume/stl-volume-page.html',
  'src/app/features/stl-watertight/stl-watertight-page.html',
  'src/app/features/three-mf/threemf-dimensions-page.html',
  'src/app/features/three-mf/threemf-manifold-page.html',
  'src/app/features/three-mf/threemf-quality-page.html',
  'src/app/features/three-mf/threemf-repair-page.html',
  'src/app/features/three-mf/threemf-triangle-page.html',
  'src/app/features/three-mf/threemf-viewer-page.html',
  'src/app/features/three-mf/threemf-volume-page.html',
  'src/app/features/three-mf/threemf-watertight-page.html',
];

const toolResultTemplates = [
  'src/app/features/converters/local-converter-page.html',
  'src/app/features/stl-dimensions/stl-dimensions-page.html',
  'src/app/features/stl-manifold/stl-manifold-page.html',
  'src/app/features/stl-repair/stl-repair-page.html',
  'src/app/features/stl-splitter/stl-splitter-page.html',
  'src/app/features/stl-triangle/stl-triangle-page.html',
  'src/app/features/stl-volume/stl-volume-page.html',
  'src/app/features/stl-watertight/stl-watertight-page.html',
  'src/app/features/three-mf/threemf-dimensions-page.html',
  'src/app/features/three-mf/threemf-manifold-page.html',
  'src/app/features/three-mf/threemf-quality-page.html',
  'src/app/features/three-mf/threemf-repair-page.html',
  'src/app/features/three-mf/threemf-triangle-page.html',
  'src/app/features/three-mf/threemf-volume-page.html',
  'src/app/features/three-mf/threemf-watertight-page.html',
];

describe('tool page layout', () => {
  it('uses the shared full-width lead rule for every interactive tool page', async () => {
    const styles = await readFile(join(projectRoot, 'src/styles.scss'), 'utf8');

    expect(styles).toContain('.tool-page > .lead {\n  max-width: 58rem;\n}');

    await Promise.all(
      toolPageTemplates.map(async (templatePath) => {
        const template = await readFile(
          join(projectRoot, templatePath),
          'utf8',
        );

        expect(template).toContain('<main class="page tool-page');
      }),
    );
  });

  it('uses the shared result-card rule for every upload result', async () => {
    const styles = await readFile(join(projectRoot, 'src/styles.scss'), 'utf8');

    expect(styles).toContain(
      '.tool-result {\n  max-width: 58rem;\n  margin-top: 2rem;\n  padding: clamp(1.25rem, 4vw, 2rem);\n}',
    );

    await Promise.all(
      toolResultTemplates.map(async (templatePath) => {
        const template = await readFile(
          join(projectRoot, templatePath),
          'utf8',
        );

        expect(template).toMatch(/class="[^"]*tool-result/);
      }),
    );
  });
});
