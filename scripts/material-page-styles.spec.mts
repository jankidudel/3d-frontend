import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const materialFeatureDirectory = new URL(
  '../src/app/features/materials/',
  import.meta.url,
);

describe('material page styling contract', () => {
  it('keeps the shared material stylesheet attached to every material page component', async () => {
    const [pages, tools, styles] = await Promise.all([
      readFile(new URL('material-pages.ts', materialFeatureDirectory), 'utf8'),
      readFile(new URL('material-tools.ts', materialFeatureDirectory), 'utf8'),
      readFile(
        new URL('material-pages.scss', materialFeatureDirectory),
        'utf8',
      ),
    ]);

    expect(pages.match(/styleUrl: '\.\/material-pages\.scss'/g)).toHaveLength(
      3,
    );
    expect(tools.match(/styleUrl: '\.\/material-pages\.scss'/g)).toHaveLength(
      2,
    );
    expect(styles).toContain('.material-form-card');
    expect(styles).toContain('.material-table-scroll');
    expect(styles).toContain('.material-result-grid');
    expect(tools).toContain('material-card-grid material-result-grid');
    expect(styles).toContain('@media (max-width: 44rem)');
  });
});
