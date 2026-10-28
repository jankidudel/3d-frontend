import { spawn } from 'node:child_process';
import {
  access,
  mkdtemp,
  readFile,
  rm,
  mkdir,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, extname } from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { loadGeneratedPages } from './check-internal-links.mts';
import { routeSearchPolicy, productionOrigin } from './route-search-policy.mts';
import { discoverRouter } from './router-source.mts';
import { inspectPublicHtml } from './seo-audit.mts';
import {
  AuditStage,
  Severity,
  finding,
  writeReport,
  expectedSelector,
  type Finding,
} from './technical-seo.mts';
import {
  artifactFiles,
  artifactHash,
  outputDirectory,
  sourceIdentity,
  reportDirectory,
} from './seo-artifact.mts';
import { PublicRouteUrl } from '../src/app/core/seo/public-routes.ts';

/** Chrome DevTools pipe transport: no listening socket, browser driver or public network. */
export class DevTools {
  private id = 0;
  private pending = new Map<
    number,
    {
      resolve: (value: Record<string, unknown>) => void;
      reject: (error: Error) => void;
    }
  >();
  listeners: ((message: Record<string, unknown>) => void)[] = [];
  private readonly output: Writable;
  constructor(output: Writable, input: Readable) {
    this.output = output;
    const fail = (error: Error) => {
      for (const pending of this.pending.values()) {
        pending.reject(error);
      }
      this.pending.clear();
    };
    input.on('end', () =>
      fail(new Error('Chrome DevTools pipe closed before completion')),
    );
    output.on('error', fail);
    let buffered = '';
    const decoder = new StringDecoder('utf8');
    input.on('data', (bytes: Buffer) => {
      buffered += decoder.write(bytes);
      let end: number;
      while ((end = buffered.indexOf('\0')) >= 0) {
        const frame = buffered.slice(0, end);
        buffered = buffered.slice(end + 1);
        if (frame) {
          this.receive(JSON.parse(frame));
        }
      }
    });
  }
  private receive(message: Record<string, unknown>) {
    if (message['id']) {
      const pending = this.pending.get(Number(message['id']));
      this.pending.delete(Number(message['id']));
      if (message['error']) {
        pending?.reject(new Error(JSON.stringify(message['error'])));
      } else {
        pending?.resolve((message['result'] ?? {}) as Record<string, unknown>);
      }
    } else {
      this.listeners.forEach((listener) => listener(message));
    }
  }
  async send(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ): Promise<Record<string, unknown>> {
    const id = ++this.id;
    const result = new Promise<Record<string, unknown>>((resolve, reject) =>
      this.pending.set(id, { resolve, reject }),
    );
    this.output.write(JSON.stringify({ id, method, params, sessionId }) + '\0');
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([
        result,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`DevTools timeout: ${method}`)),
            25000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer!);
      this.pending.delete(id);
    }
  }
  close() {
    this.output.end();
  }
}
async function browserBinary() {
  const candidates = [
    process.env['CHROME_BIN'],
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((path): path is string => !!path);
  for (const path of candidates) {
    try {
      await access(path);
      return path;
    } catch {
      continue;
    }
  }
  throw new Error(
    'Chrome unavailable. Install stable Chrome or set CHROME_BIN; required render audit cannot be skipped.',
  );
}
export function compareRendered(
  initial: ReturnType<typeof inspectPublicHtml>,
  rendered: Record<string, unknown>,
  path: string,
): Finding[] {
  const failures: Finding[] = [];
  for (const [key, rule] of [
    ['title', 'H03'],
    ['canonical', 'C02'],
    ['headings', 'H03'],
  ] as const) {
    if (JSON.stringify(initial[key]) !== JSON.stringify(rendered[key])) {
      failures.push(
        finding(
          rule,
          Severity.Error,
          path,
          AuditStage.Render,
          JSON.stringify(rendered[key]),
          `initial ${key}: ${JSON.stringify(initial[key])}`,
        ),
      );
    }
  }
  const initialNoindex = initial.robots.some((value) =>
    /(?:noindex|\bnone\b)/i.test(value),
  );
  if (initialNoindex !== rendered['noindex']) {
    failures.push(
      finding(
        'I03',
        Severity.Error,
        path,
        AuditStage.Render,
        'Index directive changed during hydration',
        'consistent initial and rendered directives',
      ),
    );
  }
  return failures;
}
export async function auditRender() {
  const started = performance.now();
  const findings: Finding[] = [];
  const rows: Record<string, unknown>[] = [];
  let complete = false;
  let attempted = 0;
  let chrome: ReturnType<typeof spawn> | undefined;
  let dev: DevTools | undefined;
  let profile: string | undefined;
  let browserError = '';
  let version: unknown = null;
  let artifactSha256: string | null = null;
  let sourceSha256: string | null = null;
  try {
    artifactSha256 = artifactHash(await artifactFiles());
    sourceSha256 = (await sourceIdentity()).sourceSha256;
    const pages = await loadGeneratedPages(outputDirectory);
    const router = discoverRouter();
    // Intercept and fulfill canonical URLs from the audited build. No request
    // reaches production and no localhost listener is required.
    const origin = productionOrigin;
    profile = await mkdtemp(resolve(tmpdir(), 'inspectmesh-chrome-'));
    chrome = spawn(
      await browserBinary(),
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-sync',
        '--no-first-run',
        '--remote-debugging-pipe',
        `--user-data-dir=${profile}`,
        'about:blank',
      ],
      { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] },
    );
    let stderr = '';
    chrome.stderr?.on('data', (bytes) => {
      stderr += String(bytes);
      browserError = stderr;
    });
    chrome.on('error', (error) => {
      stderr += String(error);
      browserError = stderr;
    });
    dev = new DevTools(
      chrome.stdio[3] as Writable,
      chrome.stdio[4] as Readable,
    );
    version = await dev.send('Browser.getVersion');
    console.log(
      'Chrome started; auditing local artifact through intercepted requests.',
    );
    const client = dev;
    let next = 0;
    async function worker() {
      const target = await client.send('Target.createTarget', {
        url: 'about:blank',
      });
      const attached = await client.send('Target.attachToTarget', {
        targetId: target['targetId'],
        flatten: true,
      });
      const session = String(attached['sessionId']);
      const send = (method: string, params: Record<string, unknown> = {}) =>
        client.send(method, params, session);
      const errors: string[] = [];
      const requests = new Map<string, string>();
      client.listeners.push((message) => {
        if (message['sessionId'] !== session) {
          return;
        }
        const params = message['params'] as Record<string, unknown>;
        if (message['method'] === 'Runtime.exceptionThrown') {
          errors.push(JSON.stringify(params));
        }
        if (
          message['method'] === 'Runtime.consoleAPICalled' &&
          params['type'] === 'error'
        ) {
          errors.push(JSON.stringify(params['args']));
        }
        if (message['method'] === 'Network.requestWillBeSent') {
          requests.set(
            String(params['requestId']),
            String((params['request'] as Record<string, unknown>)['url']),
          );
        }
        if (
          message['method'] === 'Network.loadingFailed' &&
          requests.get(String(params['requestId']))?.startsWith(origin)
        ) {
          errors.push(JSON.stringify(params));
        }
        if (message['method'] === 'Fetch.requestPaused') {
          const url = String(
            (params['request'] as Record<string, unknown>)['url'],
          );
          void (async () => {
            if (!url.startsWith(origin + '/')) {
              await send('Fetch.failRequest', {
                requestId: params['requestId'],
                errorReason: 'BlockedByClient',
              });
              return;
            }
            let status = 200;
            let body: Buffer;
            let contentType = 'application/octet-stream';
            try {
              const pathname = new URL(url).pathname;
              let path = resolve(
                outputDirectory,
                '.' + decodeURIComponent(pathname),
              );
              if (
                !path.startsWith(outputDirectory + '/') &&
                path !== outputDirectory
              ) {
                throw new Error('Outside artifact');
              }
              if (!extname(path)) {
                path = resolve(path, 'index.html');
              }
              body = await readFile(path);
              const types: Record<string, string> = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.svg': 'image/svg+xml',
                '.json': 'application/json',
                '.png': 'image/png',
                '.woff2': 'font/woff2',
                '.webmanifest': 'application/manifest+json',
              };
              contentType = types[extname(path)] ?? contentType;
              if (pathname === '/404') {
                status = 404;
              }
            } catch {
              status = 404;
              body = Buffer.from('Not found');
            }
            await send('Fetch.fulfillRequest', {
              requestId: params['requestId'],
              responseCode: status,
              responseHeaders: [
                { name: 'Content-Type', value: contentType },
                { name: 'Cache-Control', value: 'no-store' },
              ],
              body: body.toString('base64'),
            });
          })().catch((error) => errors.push(String(error)));
        }
      });
      await send('Page.enable');
      await send('Runtime.enable');
      await send('Network.enable');
      await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
      await send('Page.addScriptToEvaluateOnNewDocument', {
        source: `try { localStorage.clear(); sessionStorage.clear(); } catch {} window.__seoVitals={lcp:null,cls:0}; new PerformanceObserver(list=>{for(const entry of list.getEntries()){window.__seoVitals.lcp=entry.startTime;}}).observe({type:'largest-contentful-paint',buffered:true}); new PerformanceObserver(list=>{for(const entry of list.getEntries()){if(!entry.hadRecentInput){window.__seoVitals.cls+=entry.value;}}}).observe({type:'layout-shift',buffered:true});`,
      });
      async function evaluate(expression: string) {
        const response = await send('Runtime.evaluate', {
          expression,
          returnByValue: true,
          awaitPromise: true,
        });
        if (response['exceptionDetails']) {
          throw new Error(JSON.stringify(response['exceptionDetails']));
        }
        return (response['result'] as Record<string, unknown>)?.['value'];
      }
      async function waitFor(expression: string) {
        for (let attempt = 0; attempt < 200; attempt++) {
          if (await evaluate(expression)) {
            return;
          }
          await delay(100);
        }
        throw new Error(`Browser readiness timeout: ${expression}`);
      }
      const snapshot = `(()=>({title:document.title,canonical:document.querySelector('link[rel="canonical"]')?.getAttribute('href')??null,headings:[...document.querySelectorAll('h1')].map(e=>e.textContent.trim()),noindex:[...document.querySelectorAll('meta[name]')].some(e=>['robots','googlebot'].includes(e.name.toLowerCase())&&/(?:noindex|\\bnone\\b)/i.test(e.content)),vitals:window.__seoVitals,main:document.querySelector('main')?.textContent.replace(/\\s+/g,' ').trim()??'',overflow:document.documentElement.scrollWidth>innerWidth+1,images:[...document.images].filter(e=>!e.complete||!e.naturalWidth).map(e=>e.src),links:[...document.querySelectorAll('main a[href]')].map(e=>e.getAttribute('href'))}))()`;
      while (next < routeSearchPolicy.length) {
        const policy = routeSearchPolicy[next++];
        attempted++;
        console.log(`Rendering ${policy.path}`);
        const initial = inspectPublicHtml(
          pages.find((page) => page.route === policy.path)!,
        );
        const selector = expectedSelector(
          router.routes.find((route) => route.path === policy.path)!,
        );
        errors.length = 0;
        try {
          await send('Emulation.setDeviceMetricsOverride', {
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            mobile: true,
          });
          await send('Page.navigate', { url: origin + policy.path });
          await waitFor(
            `document.documentElement.dataset.appReady==='true' && !!document.querySelector(${JSON.stringify(selector)})`,
          );
          const rendered = (await evaluate(snapshot)) as Record<
            string,
            unknown
          >;
          findings.push(...compareRendered(initial, rendered, policy.path));
          const initialWindow = new JSDOM(
            pages.find((page) => page.route === policy.path)!.html,
          ).window;
          const critical = [
            ...initialWindow.document.querySelectorAll('main h2'),
          ]
            .slice(0, 3)
            .map(
              (element) =>
                element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            );
          initialWindow.close();
          if (
            String(rendered['main']).length < 40 ||
            critical.some((text) => !String(rendered['main']).includes(text))
          ) {
            findings.push(
              finding(
                'H04',
                Severity.Error,
                policy.path,
                AuditStage.Render,
                'Lost core content after hydration',
                'initial main headings and substantive text',
              ),
            );
          }
          if (rendered['overflow']) {
            findings.push(
              finding(
                'H06',
                Severity.Error,
                policy.path,
                AuditStage.Render,
                'Document overflows mobile viewport',
                'contained horizontal scrolling at 390px',
              ),
            );
          }
          if (errors.length) {
            findings.push(
              finding(
                'H07',
                Severity.Error,
                policy.path,
                AuditStage.Render,
                errors.join('\n'),
                'no first-party runtime failures',
              ),
            );
          }
          const family = policy.pageType;
          // One desktop page per independently declared template family.
          if (!rows.some((row) => row['desktopFamily'] === family)) {
            await send('Emulation.setDeviceMetricsOverride', {
              width: 1280,
              height: 900,
              deviceScaleFactor: 1,
              mobile: false,
            });
            const desktop = (await evaluate(snapshot)) as Record<
              string,
              unknown
            >;
            findings.push(...compareRendered(initial, desktop, policy.path));
            if (desktop['overflow']) {
              findings.push(
                finding(
                  'H06',
                  Severity.Error,
                  policy.path,
                  AuditStage.Render,
                  'Document overflows desktop viewport',
                  'contained horizontal scrolling at 1280px',
                ),
              );
            }
            rows.push({
              url: productionOrigin + policy.path,
              mobile: true,
              vitals: rendered['vitals'],
              desktopFamily: family,
            });
          } else {
            rows.push({
              url: productionOrigin + policy.path,
              mobile: true,
              vitals: rendered['vitals'],
            });
          }
          if (policy.path === PublicRouteUrl.Examples) {
            await send('Emulation.setDeviceMetricsOverride', {
              width: 390,
              height: 844,
              deviceScaleFactor: 1,
              mobile: true,
            });
            const links = (await evaluate(
              `[...document.querySelectorAll('nav[aria-label="Example topics"] a')].map(e=>({href:e.getAttribute('href'),id:new URL(e.href).hash.slice(1)}))`,
            )) as { href: string; id: string }[];
            for (const link of links) {
              await evaluate(
                `document.querySelector('a[href='+CSS.escape(${JSON.stringify(link.href)})+']').click()`,
              );
              await waitFor(
                `location.pathname===${JSON.stringify(policy.path)} && location.hash===${JSON.stringify('#' + link.id)} && document.getElementById(${JSON.stringify(link.id)}).getBoundingClientRect().top<160 && document.getElementById(${JSON.stringify(link.id)}).getBoundingClientRect().bottom>0`,
              );
              await send('Page.navigate', { url: origin + link.href });
              await waitFor(
                `document.documentElement.dataset.appReady==='true' && document.getElementById(${JSON.stringify(link.id)}).getBoundingClientRect().top<160`,
              );
            }
            const history = await send('Page.getNavigationHistory');
            const entries = history['entries'] as { id: number }[];
            const current = Number(history['currentIndex']);
            if (current > 0) {
              await send('Page.navigateToHistoryEntry', {
                entryId: entries[current - 1].id,
              });
              await waitFor(
                `location.pathname===${JSON.stringify(policy.path)}`,
              );
              await send('Page.navigateToHistoryEntry', {
                entryId: entries[current].id,
              });
              await waitFor(
                `location.hash===${JSON.stringify('#' + links.at(-1)!.id)}`,
              );
            }
            await mkdir(reportDirectory, { recursive: true });
            const screenshot = await send('Page.captureScreenshot', {
              format: 'png',
              captureBeyondViewport: false,
            });
            await writeFile(
              resolve(reportDirectory, 'examples-mobile.png'),
              Buffer.from(String(screenshot['data']), 'base64'),
            );
          }
          // Actual client navigation across families must update page identity.
          if (policy.path === PublicRouteUrl.AllTools) {
            await evaluate(
              `document.querySelector('a[href='+CSS.escape(${JSON.stringify(PublicRouteUrl.Guides)})+']').click()`,
            );
            await waitFor(
              `location.pathname===${JSON.stringify(PublicRouteUrl.Guides)} && document.querySelector('link[rel="canonical"]')?.href===${JSON.stringify(productionOrigin + PublicRouteUrl.Guides)}`,
            );
            const guide = inspectPublicHtml(
              pages.find((page) => page.route === PublicRouteUrl.Guides)!,
            );
            findings.push(
              ...compareRendered(
                guide,
                (await evaluate(snapshot)) as Record<string, unknown>,
                PublicRouteUrl.Guides,
              ),
            );
          }
        } catch (error) {
          findings.push(
            finding(
              'H03',
              Severity.Error,
              policy.path,
              AuditStage.Render,
              String(error),
              'complete usable direct-load/hydrated page',
            ),
          );
        }
        if (rows.length % 25 === 0) {
          console.log(
            `Browser audit: ${rows.length}/${routeSearchPolicy.length} pages.`,
          );
        }
      }
      await client.send('Target.closeTarget', { targetId: target['targetId'] });
    }
    await Promise.all([worker(), worker(), worker()]);
    complete = rows.length === routeSearchPolicy.length;
  } catch (error) {
    findings.push(
      finding(
        'H03',
        Severity.Unknown,
        '/',
        AuditStage.Render,
        String(error) + (browserError ? `; Chrome: ${browserError}` : ''),
        'available Chrome pipe and local artifact browser audit',
      ),
    );
  } finally {
    dev?.close();
    chrome?.kill();
    if (profile) {
      await rm(profile, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      }).catch(() => undefined);
    }
  }
  const report = {
    stage: AuditStage.Render,
    complete,
    expected: routeSearchPolicy.length,
    attempted,
    completed: rows.length,
    artifactSha256,
    sourceSha256,
    elapsedMs: Math.round(performance.now() - started),
    browser: version,
    optionalServices:
      'All third-party requests blocked; first-party failures remain blocking.',
    rows,
    findings,
  };
  await writeReport('render', report);
  return report;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const report = await auditRender();
  process.exitCode = !report.complete
    ? 2
    : report.findings.some((f) => f.severity === Severity.Error)
      ? 1
      : 0;
}
