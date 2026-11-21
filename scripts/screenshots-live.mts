/**
 * Manual post-deployment visual check: captures every sitemap URL of the live
 * site as full-page screenshots, on desktop and mobile, with JavaScript
 * enabled and disabled. The no-JS set shows exactly what the prerendered HTML
 * renders before (or without) Angular, which is what crawlers see first.
 *
 *   npm run screenshots:live
 *   npm run screenshots:live -- --limit 5 --match /guides
 *   npm run screenshots:live -- --origin http://localhost:4200
 *
 * Output: images/screenshots/<timestamp>/<viewport>-<js|nojs>/<page>.png plus
 * an index.html that shows the four captures of each page side by side.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { browserBinary, startAuditBrowser } from './seo-browser.mts';
import { productionOrigin } from './route-search-policy.mts';

export const Viewports = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
} as const;
type ViewportName = keyof typeof Viewports;
export const ScriptModes = { js: true, nojs: false } as const;
type ScriptMode = keyof typeof ScriptModes;

/** Chrome cannot capture taller images; longer pages are cut (device pixels). */
const MAX_CAPTURE_DEVICE_PIXELS = 16_000;
const NAVIGATION_TIMEOUT_MS = 30_000;
const APP_READY_TIMEOUT_MS = 10_000;
const SETTLE_MS = 800;
const CONCURRENCY = 3;

export interface Options {
  readonly origin: string;
  readonly limit: number | null;
  readonly match: string | null;
  readonly outputRoot: string;
}

export function parseOptions(argv: readonly string[]): Options {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const limit = value('--limit');
  return {
    origin: (value('--origin') ?? productionOrigin).replace(/\/$/, ''),
    limit: limit === undefined ? null : Math.max(1, Number.parseInt(limit, 10)),
    match: value('--match') ?? null,
    outputRoot: resolve(
      value('--out') ??
        resolve(import.meta.dirname, '..', 'images', 'screenshots'),
    ),
  };
}

/** Sitemap <loc> values, re-based on the chosen origin for local runs. */
export function sitemapPaths(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => {
    const url = new URL(match[1]);
    return url.pathname + url.search;
  });
}

/** Stable, readable file name for a URL path ("/" becomes "home"). */
export function fileNameForPath(path: string): string {
  const name = path
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '__');
  return (name || 'home') + '.png';
}

interface Capture {
  readonly path: string;
  readonly viewport: ViewportName;
  readonly mode: ScriptMode;
  readonly file: string;
  readonly ok: boolean;
  readonly status: number | null;
  readonly fullHeight: number | null;
  readonly truncated: boolean;
  readonly error?: string;
}

type Send = (
  method: string,
  params?: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

async function capturePage(
  send: Send,
  waitForEvent: (method: string, timeoutMs: number) => Promise<void>,
  lastStatus: () => number | null,
  url: string,
  viewport: ViewportName,
  mode: ScriptMode,
) {
  const metrics = Viewports[viewport];
  await send('Emulation.setDeviceMetricsOverride', metrics);
  const loaded = waitForEvent('Page.loadEventFired', NAVIGATION_TIMEOUT_MS);
  const navigation = await send('Page.navigate', { url });
  if (navigation['errorText']) {
    throw new Error(String(navigation['errorText']));
  }
  await loaded;
  if (ScriptModes[mode]) {
    // main.ts marks hydration complete; capture the interactive state.
    const deadline = Date.now() + APP_READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const ready = await send('Runtime.evaluate', {
        expression: "document.documentElement.dataset.appReady === 'true'",
        returnByValue: true,
      });
      if ((ready['result'] as { value?: unknown })?.value === true) {
        break;
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 200));
    }
  }
  const layout = await send('Page.getLayoutMetrics');
  const content = layout['cssContentSize'] as { height: number } | undefined;
  const fullHeight = Math.ceil(content?.height ?? metrics.height);
  const maxHeight = Math.floor(
    MAX_CAPTURE_DEVICE_PIXELS / metrics.deviceScaleFactor,
  );
  const height = Math.min(Math.max(fullHeight, metrics.height), maxHeight);
  // A viewport as tall as the page loads lazy images without running script,
  // so the no-JS captures show below-the-fold images too.
  await send('Emulation.setDeviceMetricsOverride', { ...metrics, height });
  await new Promise((resolveWait) => setTimeout(resolveWait, SETTLE_MS));
  const image = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  return {
    data: Buffer.from(String(image['data']), 'base64'),
    status: lastStatus(),
    fullHeight,
    truncated: fullHeight > maxHeight,
  };
}

function galleryHtml(origin: string, captures: readonly Capture[]): string {
  const escape = (text: string) =>
    text.replace(/[&<>"]/g, (character) => `&#${character.charCodeAt(0)};`);
  const paths = [...new Set(captures.map((capture) => capture.path))];
  const columns: [ViewportName, ScriptMode][] = [
    ['desktop', 'js'],
    ['desktop', 'nojs'],
    ['mobile', 'js'],
    ['mobile', 'nojs'],
  ];
  const rows = paths
    .map((path) => {
      const cells = columns
        .map(([viewport, mode]) => {
          const capture = captures.find(
            (item) =>
              item.path === path &&
              item.viewport === viewport &&
              item.mode === mode,
          );
          if (!capture?.ok) {
            return `<td class="failed">${escape(capture?.error ?? 'missing')}</td>`;
          }
          return `<td><a href="${escape(capture.file)}"><img loading="lazy" src="${escape(capture.file)}" alt="${escape(`${path} ${viewport} ${mode}`)}"></a>${capture.truncated ? '<small>long page: capture cut off</small>' : ''}</td>`;
        })
        .join('');
      return `<tr><th><a href="${escape(origin + path)}">${escape(path)}</a></th>${cells}</tr>`;
    })
    .join('\n');
  return `<!doctype html><meta charset="utf-8"><title>Screenshots ${escape(origin)}</title>
<style>body{font:14px system-ui;margin:16px}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;max-width:220px;word-break:break-all}img{width:220px;max-height:600px;object-fit:cover;object-position:top}td.failed{color:#b00020;max-width:220px}small{display:block;color:#666}</style>
<h1>${escape(origin)}</h1><p>${paths.length} pages. Columns: desktop JS, desktop no-JS, mobile JS, mobile no-JS. Click an image for full size.</p>
<table><tr><th>Page</th><th>Desktop JS</th><th>Desktop no-JS</th><th>Mobile JS</th><th>Mobile no-JS</th></tr>
${rows}
</table>`;
}

export async function captureSite(options: Options): Promise<Capture[]> {
  const sitemap = await fetch(options.origin + '/sitemap.xml', {
    signal: AbortSignal.timeout(15_000),
  });
  if (!sitemap.ok) {
    throw new Error(`sitemap.xml returned ${sitemap.status}`);
  }
  let paths = sitemapPaths(await sitemap.text());
  if (options.match) {
    paths = paths.filter((path) => path.includes(options.match!));
  }
  if (options.limit) {
    paths = paths.slice(0, options.limit);
  }
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const outputDirectory = join(options.outputRoot, stamp);
  const jobs = paths.flatMap((path) =>
    (Object.keys(Viewports) as ViewportName[]).flatMap((viewport) =>
      (Object.keys(ScriptModes) as ScriptMode[]).map((mode) => ({
        path,
        viewport,
        mode,
      })),
    ),
  );
  for (const viewport of Object.keys(Viewports)) {
    for (const mode of Object.keys(ScriptModes)) {
      await mkdir(join(outputDirectory, `${viewport}-${mode}`), {
        recursive: true,
      });
    }
  }
  console.log(
    `Capturing ${paths.length} pages x 4 (desktop/mobile, JS on/off) from ${options.origin} into ${outputDirectory}`,
  );
  const queues: Record<ScriptMode, typeof jobs> = {
    js: jobs.filter((job) => job.mode === 'js'),
    nojs: jobs.filter((job) => job.mode === 'nojs'),
  };
  const browser = await startAuditBrowser(await browserBinary());
  const captures: Capture[] = [];
  // One tab per script mode and worker: disabling script applies per tab.
  async function worker(mode: ScriptMode) {
    const { client } = browser;
    const target = await client.send('Target.createTarget', {
      url: 'about:blank',
    });
    const attached = await client.send('Target.attachToTarget', {
      targetId: target['targetId'],
      flatten: true,
    });
    const session = String(attached['sessionId']);
    const send: Send = (method, params = {}) =>
      client.send(method, params, session, NAVIGATION_TIMEOUT_MS);
    let status: number | null = null;
    const waiters = new Map<string, () => void>();
    const listener = (message: Record<string, unknown>) => {
      if (message['sessionId'] !== session) {
        return;
      }
      const method = String(message['method']);
      if (method === 'Network.responseReceived') {
        const params = message['params'] as {
          type?: string;
          response?: { status?: number };
        };
        if (params.type === 'Document') {
          status = params.response?.status ?? null;
        }
      }
      waiters.get(method)?.();
    };
    client.listeners.push(listener);
    const waitForEvent = (method: string, timeoutMs: number) =>
      new Promise<void>((resolveEvent, rejectEvent) => {
        const timer = setTimeout(() => {
          waiters.delete(method);
          rejectEvent(new Error(`Timed out waiting for ${method}`));
        }, timeoutMs);
        waiters.set(method, () => {
          clearTimeout(timer);
          waiters.delete(method);
          resolveEvent();
        });
      });
    await send('Page.enable');
    await send('Network.enable');
    await send('Runtime.enable');
    await send('Emulation.setScriptExecutionDisabled', {
      value: !ScriptModes[mode],
    });
    try {
      for (let job = queues[mode].shift(); job; job = queues[mode].shift()) {
        const relativeFile = `${job.viewport}-${job.mode}/${fileNameForPath(job.path)}`;
        try {
          status = null;
          const result = await capturePage(
            send,
            waitForEvent,
            () => status,
            options.origin + job.path,
            job.viewport,
            job.mode,
          );
          await writeFile(join(outputDirectory, relativeFile), result.data);
          captures.push({
            ...job,
            file: relativeFile,
            ok: result.status === null || result.status < 400,
            status: result.status,
            fullHeight: result.fullHeight,
            truncated: result.truncated,
            ...(result.status !== null && result.status >= 400
              ? { error: `HTTP ${result.status}` }
              : {}),
          });
        } catch (error) {
          captures.push({
            ...job,
            file: relativeFile,
            ok: false,
            status,
            fullHeight: null,
            truncated: false,
            error: String(error),
          });
        }
        const done = captures.length;
        if (done % 20 === 0) {
          console.log(`Captured ${done} screenshots...`);
        }
      }
    } finally {
      client.listeners.splice(client.listeners.indexOf(listener), 1);
      await client
        .send('Target.closeTarget', { targetId: target['targetId'] })
        .catch(() => undefined);
    }
  }
  try {
    const workers: Promise<void>[] = [];
    for (let index = 0; index < CONCURRENCY; index++) {
      workers.push(worker('js'), worker('nojs'));
    }
    await Promise.all(workers);
  } finally {
    await browser.close();
  }
  captures.sort(
    (a, b) =>
      a.path.localeCompare(b.path) ||
      a.viewport.localeCompare(b.viewport) ||
      a.mode.localeCompare(b.mode),
  );
  await writeFile(
    join(outputDirectory, 'manifest.json'),
    JSON.stringify(
      {
        origin: options.origin,
        capturedAt: new Date().toISOString(),
        captures,
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(outputDirectory, 'index.html'),
    galleryHtml(options.origin, captures),
  );
  const failed = captures.filter((capture) => !capture.ok);
  console.log(
    `Saved ${captures.length - failed.length}/${captures.length} screenshots. Open ${join(outputDirectory, 'index.html')}`,
  );
  for (const capture of failed) {
    console.error(
      `Failed: ${capture.path} ${capture.viewport} ${capture.mode}: ${capture.error}`,
    );
  }
  return captures;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const captures = await captureSite(parseOptions(process.argv.slice(2)));
  process.exitCode = captures.some((capture) => !capture.ok) ? 1 : 0;
}
