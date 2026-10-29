import { describe, expect, it, vi } from 'vitest';
import { createModulePreloadCompleter } from './module-preloads.mts';

describe('module preload completion', () => {
  it('flattens static dependency chains without loading dynamic routes or external modules', async () => {
    const modules: Record<string, string> = {
      'main.js': 'import "./shared.js"; import("./viewer.js");',
      'shared.js':
        'export {value} from "./routes.js"; import "https://example.com/sdk.js";',
      'routes.js': 'import "./shared.js"; export const value = 1;',
    };
    const readModule = vi.fn(async (filename: string) => {
      if (!(filename in modules)) {
        throw new Error(`Unexpected eager request: ${filename}`);
      }
      return modules[filename];
    });
    const complete = createModulePreloadCompleter(readModule);
    const html =
      '<head><link rel="modulepreload" href="shared.js"></head><body><script src="main.js" type="module"></script></body>';
    const output = await complete(html);
    expect(output).toContain(
      '<link rel="modulepreload" href="routes.js"></head>',
    );
    expect(output.match(/href="shared.js"/g)).toHaveLength(1);
    expect(output).not.toContain('viewer.js');
    expect(output).not.toContain('example.com');
    expect(await complete(output)).toBe(output);
    expect(readModule).toHaveBeenCalledTimes(3);
  });

  it('leaves documents with no module entrypoints unchanged', async () => {
    const readModule = vi.fn();
    const html = '<head></head><body><script src="legacy.js"></script></body>';
    expect(await createModulePreloadCompleter(readModule)(html)).toBe(html);
    expect(readModule).not.toHaveBeenCalled();
  });

  it('fails the build for a missing static dependency', async () => {
    const complete = createModulePreloadCompleter(async () => {
      throw new Error('Missing module');
    });
    await expect(
      complete('<head><link rel="modulepreload" href="missing.js"></head>'),
    ).rejects.toThrow('Missing module');
  });
});
