import { readFile, readdir } from 'node:fs/promises';
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

const standardContentTemplates = toolPageTemplates.filter(
  (templatePath) =>
    templatePath !== 'src/app/features/stl-splitter/stl-splitter-page.html',
);

const primaryQualityCheckTemplates = [
  'src/app/features/three-mf/threemf-manifold-page.html',
  'src/app/features/three-mf/threemf-watertight-page.html',
];

describe('tool page layout', () => {
  it('places file selection before examples and supporting content on upload tools', async () => {
    const features = join(projectRoot, 'src/app/features');
    const files = await readdir(features, { recursive: true });
    for (const file of files.filter((file) => file.endsWith('-page.html'))) {
      const template = await readFile(join(features, file), 'utf8');
      if (!template.includes('tool-page')) {
        continue;
      }
      const picker = template.search(
        /<app-(?:stl|three-mf)-file-picker\b|<input\b[^>]*type="file"/s,
      );
      if (picker < 0) {
        continue;
      }
      for (const supporting of [
        '<app-example-loader',
        '<section class="content',
      ]) {
        const position = template.indexOf(supporting);
        if (position >= 0) {
          expect(
            picker,
            `${file}: file selection must precede ${supporting}`,
          ).toBeLessThan(position);
        }
      }
    }
  });

  it('uses the shared full-width lead rule for every interactive tool page', async () => {
    const styles = await readFile(join(projectRoot, 'src/styles.scss'), 'utf8');

    expect(styles).toContain(
      '.tool-page {\n  --tool-content-width: 58rem;\n  --tool-card-padding: clamp(1.25rem, 4vw, 2rem);\n  --tool-section-gap: 2rem;\n}',
    );
    expect(styles).toContain(
      '.tool-page > .lead {\n  max-width: var(--tool-content-width);\n}',
    );

    await Promise.all(
      standardContentTemplates.map(async (templatePath) => {
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
      '.tool-result {\n  max-width: var(--tool-content-width);\n  margin-top: var(--tool-section-gap);\n  padding: var(--tool-card-padding);\n}',
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

  it('uses the shared full-width content rule for every tool page', async () => {
    const styles = await readFile(join(projectRoot, 'src/styles.scss'), 'utf8');

    expect(styles).toContain(
      '.tool-page > .content,\n.tool-content > .content {\n  width: 100%;\n  max-width: var(--tool-content-width);\n}',
    );

    await Promise.all(
      toolPageTemplates.map(async (templatePath) => {
        const template = await readFile(
          join(projectRoot, templatePath),
          'utf8',
        );

        expect(template).toMatch(/class="[^"]*\bcontent\b/);
      }),
    );
  });

  it('uses the shared content container for the splitter workflow', async () => {
    const styles = await readFile(join(projectRoot, 'src/styles.scss'), 'utf8');
    const template = await readFile(
      join(projectRoot, 'src/app/features/stl-splitter/stl-splitter-page.html'),
      'utf8',
    );

    expect(template).toContain('class="tool-content splitter-content"');
    expect(template).toContain('class="tool-related-links card"');
    expect(styles).toContain(
      '.tool-related-links {\n  width: 100%;\n  max-width: var(--tool-content-width);\n  padding: var(--tool-card-padding);\n}',
    );
  });

  it('separates the primary 3MF quality action from supporting links', async () => {
    const styles = await readFile(
      join(projectRoot, 'src/app/features/shared/model-checker-page.scss'),
      'utf8',
    );

    expect(styles).toContain('.next-actions-stacked {\n  display: grid;\n}');

    await Promise.all(
      primaryQualityCheckTemplates.map(async (templatePath) => {
        const template = await readFile(
          join(projectRoot, templatePath),
          'utf8',
        );

        expect(template).toContain('next-actions next-actions-stacked');
        expect(template).toContain('Run full 3MF quality check');
        expect(template).toContain('class="next-actions-links"');
      }),
    );
  });
});
