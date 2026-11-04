import { priorityDiscoveryPaths } from '../src/content/guides/guide-clusters.mts';
import {
  browserSnapshotExpression,
  pageReadyExpression,
  isNavigationContextError,
  logBrowserFindings,
} from './seo-browser-diagnostics.mts';
import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import {
  access,
  mkdtemp,
  readFile,
  rm,
  mkdir,
  writeFile,
} from 'node:fs/promises';
import { tmpdir, cpus, totalmem } from 'node:os';
import { basename, resolve, extname } from 'node:path';
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
    input.on('error', fail);
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
    timeoutMs = 25000,
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
            timeoutMs,
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
  const configured = process.env['CHROME_BIN'];
  if (configured) {
    await access(configured, constants.X_OK);
    return configured;
  }
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const path of candidates) {
    try {
      await access(path, constants.X_OK);
      return path;
    } catch {
      continue;
    }
  }
  throw new Error(
    'Chrome unavailable. Install stable Chrome or set CHROME_BIN; required render audit cannot be skipped.',
  );
}

const browserStartupTimeoutMs = 45_000;
const browserStartupAttempts = 2;

export async function startAuditBrowser(
  binary: string,
  timeoutMs = browserStartupTimeoutMs,
) {
  const errors: string[] = [];
  for (let attempt = 1; attempt <= browserStartupAttempts; attempt++) {
    const profile = await mkdtemp(resolve(tmpdir(), 'inspectmesh-chrome-'));
    const headlessFlags =
      basename(binary) === 'chrome-headless-shell' ? [] : ['--headless=new'];
    const chrome = spawn(
      binary,
      [
        ...headlessFlags,
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
    chrome.stderr?.setEncoding('utf8').on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-8_192);
    });
    const exited = new Promise<void>((resolveExit) => {
      chrome.once('exit', () => resolveExit());
      chrome.once('error', (error) => {
        stderr += String(error);
        resolveExit();
      });
    });
    const client = new DevTools(
      chrome.stdio[3] as Writable,
      chrome.stdio[4] as Readable,
    );
    const close = async () => {
      client.close();
      const forceKill = setTimeout(() => chrome.kill('SIGKILL'), 2_000);
      chrome.kill();
      await exited;
      clearTimeout(forceKill);
      await rm(profile, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      }).catch(() => undefined);
    };
    try {
      const version = await client.send(
        'Browser.getVersion',
        {},
        undefined,
        timeoutMs,
      );
      return { client, version, close, diagnostics: () => stderr.trim() };
    } catch (error) {
      await close();
      const detail = `attempt ${attempt}/${browserStartupAttempts}: ${String(error)}${stderr ? `; Chrome: ${stderr.trim()}` : ''}`;
      errors.push(detail);
      console.warn(`[render:startup] ${detail}`);
    }
  }
  throw new Error(`Chrome could not start at ${binary}. ${errors.join('\n')}`);
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
  let captureCount = 0;
  const debugPages: Record<string, unknown>[] = [];
  const environment = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpuCount: cpus().length,
    memoryBytes: totalmem(),
    ci: process.env['CI'] ?? null,
    githubRunId: process.env['GITHUB_RUN_ID'] ?? null,
    githubRunAttempt: process.env['GITHUB_RUN_ATTEMPT'] ?? null,
    concurrency: 3,
    readinessTimeoutMs: 20000,
    browserStartupTimeoutMs,
    browserStartupAttempts,
  };
  console.log(`Browser audit environment: ${JSON.stringify(environment)}`);
  let browser: Awaited<ReturnType<typeof startAuditBrowser>> | undefined;
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
    browser = await startAuditBrowser(await browserBinary());
    version = browser.version;
    console.log(
      'Chrome started; auditing local artifact through intercepted requests.',
    );
    const client = browser.client;
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
      const pendingInterceptions = new Set<Promise<void>>();
      const recentRequests: Record<string, unknown>[] = [];
      let phase = 'setup';
      let currentPath = 'about:blank';
      let navigation: Record<string, unknown> | null = null;
      let readinessExpression = '';
      let diagnosticOnly = false;
      function requestEvidence(item: Record<string, unknown>) {
        recentRequests.push(item);
        if (recentRequests.length > 60) {
          recentRequests.shift();
        }
      }
      const requests = new Map<string, string>();
      client.listeners.push((message) => {
        if (message['sessionId'] !== session) {
          return;
        }
        const params = message['params'] as Record<string, unknown>;
        if (message['method'] === 'Runtime.exceptionThrown') {
          if (!diagnosticOnly) {
            errors.push(JSON.stringify(params));
          }
        }
        if (
          message['method'] === 'Runtime.consoleAPICalled' &&
          params['type'] === 'error'
        ) {
          if (!diagnosticOnly) {
            errors.push(JSON.stringify(params['args']));
          }
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
          requestEvidence({
            kind: 'loading-failed',
            url: requests.get(String(params['requestId'])),
            ...params,
          });
          if (!diagnosticOnly) {
            errors.push(JSON.stringify(params));
          }
        }
        if (message['method'] === 'Fetch.requestPaused') {
          const url = String(
            (params['request'] as Record<string, unknown>)['url'],
          );
          const requestPath = currentPath;
          const interception = (async () => {
            if (!url.startsWith(origin + '/')) {
              requestEvidence({
                kind: 'blocked-third-party',
                url,
                page: requestPath,
              });
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
            requestEvidence({
              kind: 'fulfilled',
              url,
              status,
              contentType,
              bytes: body.length,
              page: requestPath,
            });
            await send('Fetch.fulfillRequest', {
              requestId: params['requestId'],
              responseCode: status,
              responseHeaders: [
                { name: 'Content-Type', value: contentType },
                { name: 'Cache-Control', value: 'no-store' },
              ],
              body: body.toString('base64'),
            });
          })().catch((error) => {
            requestEvidence({
              kind: 'interception-error',
              url,
              page: requestPath,
              error: String(error),
            });
            if (!diagnosticOnly) {
              errors.push(
                `Browser interception for ${url} on ${requestPath}: ${String(error)}`,
              );
            }
          });
          pendingInterceptions.add(interception);
          void interception.finally(() =>
            pendingInterceptions.delete(interception),
          );
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
          readinessExpression = expression;
          try {
            if (await evaluate(expression)) {
              return;
            }
          } catch (error) {
            if (!isNavigationContextError(error)) {
              throw error;
            }
          }
          await delay(100);
        }
        throw new Error(`Browser readiness timeout: ${expression}`);
      }
      const snapshot = browserSnapshotExpression;
      async function captureFailure(
        path: string,
        selector: string,
        pageFindings: Finding[],
      ) {
        const debug: Record<string, unknown> = {
          url: productionOrigin + path,
          phase,
          selector,
          navigation,
          readinessExpression,
          runtimeErrors: [...errors],
          requests: [...recentRequests],
          findings: pageFindings,
        };
        const fileId = `${String(debugPages.length + 1).padStart(3, '0')}-${path === '/' ? 'home' : path.slice(1).replaceAll('/', '--')}`;
        const folder = resolve(reportDirectory, 'failed-pages');
        try {
          const response = await client.send(
            'Runtime.evaluate',
            { expression: snapshot, returnByValue: true },
            session,
            3000,
          );
          debug['page'] =
            (response['result'] as Record<string, unknown>)?.['value'] ?? null;
          debug['probeException'] = response['exceptionDetails'] ?? null;
        } catch (error) {
          debug['captureError'] = String(error);
        }
        if (captureCount < 8) {
          captureCount++;
          try {
            await mkdir(folder, { recursive: true });
            const response = await client.send(
              'Runtime.evaluate',
              {
                expression: "document.documentElement?.outerHTML ?? ''",
                returnByValue: true,
              },
              session,
              3000,
            );
            const html = String(
              (response['result'] as Record<string, unknown>)?.['value'] ?? '',
            );
            await writeFile(
              resolve(folder, fileId + '.html'),
              html.slice(0, 512 * 1024),
            );
            debug['html'] = 'failed-pages/' + fileId + '.html';
            debug['htmlTruncated'] = html.length > 512 * 1024;
            const screenshot = await client.send(
              'Page.captureScreenshot',
              { format: 'png', captureBeyondViewport: false },
              session,
              3000,
            );
            await writeFile(
              resolve(folder, fileId + '.png'),
              Buffer.from(String(screenshot['data']), 'base64'),
            );
            debug['screenshot'] = 'failed-pages/' + fileId + '.png';
          } catch (error) {
            debug['artifactCaptureError'] = String(error);
          }
        }
        await mkdir(folder, { recursive: true });
        await writeFile(
          resolve(folder, fileId + '.json'),
          JSON.stringify(debug, null, 2) + '\n',
        );
        debugPages.push(debug);
        const observed = (debug['page'] ?? {}) as Record<string, unknown>;
        console.error(
          `[render:page] ${JSON.stringify({ url: debug['url'], phase, navigation, page: { href: observed['href'], readyState: observed['readyState'], appReady: observed['appReady'], title: observed['title'], headings: observed['headings'], viewport: observed['viewport'], mainExcerpt: String(observed['main'] ?? '').slice(0, 700) }, details: 'failed-pages/' + fileId + '.json' })}`,
        );
      }
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
        // Finish responses from the preceding page before assigning errors to a new one.
        await Promise.all([...pendingInterceptions]);
        const findingStart = findings.length;
        errors.length = 0;
        recentRequests.length = 0;
        requests.clear();
        currentPath = policy.path;
        navigation = null;
        readinessExpression = '';
        phase = 'navigation';
        diagnosticOnly = false;
        try {
          await send('Emulation.setDeviceMetricsOverride', {
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            mobile: true,
          });
          navigation = await send('Page.navigate', {
            url: origin + policy.path,
          });
          if (navigation['errorText']) {
            throw new Error(
              `Page.navigate failed: ${String(navigation['errorText'])}`,
            );
          }
          phase = 'readiness';
          await waitFor(pageReadyExpression(policy.path, selector));
          phase = 'mobile-snapshot';
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
          const captureReview = [
            PublicRouteUrl.AllTools,
            PublicRouteUrl.Guides,
            PublicRouteUrl.QualityCheck,
          ].some((path) => path === policy.path);
          const capture = async (viewport: string): Promise<void> => {
            const image = await send('Page.captureScreenshot', {
              format: 'png',
              captureBeyondViewport: false,
            });
            await mkdir(reportDirectory, { recursive: true });
            await writeFile(
              resolve(
                reportDirectory,
                policy.path.slice(1).replaceAll('/', '-') +
                  '-' +
                  viewport +
                  '.png',
              ),
              Buffer.from(String(image['data']), 'base64'),
            );
          };
          if (captureReview) {
            await capture('mobile');
          }
          const family = policy.pageType;
          // One desktop page per independently declared template family.
          if (
            !rows.some((row) => row['desktopFamily'] === family) ||
            priorityDiscoveryPaths.some((path) => path === policy.path) ||
            captureReview
          ) {
            phase = 'desktop-snapshot';
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
            if (captureReview) {
              await capture('desktop');
            }
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
            phase = 'example-topic-filters';
            const filters = '.filter-buttons button[aria-pressed]';
            const cards = '.example-grid > article';
            const filterState = (await evaluate(`(() => {
              const buttons = [...document.querySelectorAll(${JSON.stringify(filters)})];
              const cards = [...document.querySelectorAll(${JSON.stringify(cards)})];
              const selected = buttons.slice(0, 2);
              const topics = selected.map(button => button.textContent.trim());
              selected.forEach(button => button.click());
              return {
                ids: cards.filter(card => topics.includes(card.querySelector('.example-category').textContent.trim())).map(card => card.id).sort(),
                total: cards.length,
                initialHash: location.hash,
              };
            })()`)) as { ids: string[]; total: number; initialHash: string };
            await waitFor(
              `document.querySelectorAll(${JSON.stringify(filters + '[aria-pressed="true"]')}).length === 2 && JSON.stringify([...document.querySelectorAll(${JSON.stringify(cards)})].map(card => card.id).sort()) === ${JSON.stringify(JSON.stringify(filterState.ids))} && location.hash === ${JSON.stringify(filterState.initialHash)}`,
            );
            await evaluate(
              `document.querySelector('.filter-buttons button:last-child').click()`,
            );
            await waitFor(
              `document.querySelectorAll(${JSON.stringify(cards)}).length === ${filterState.total}`,
            );

            phase = 'fragment-navigation';
            await send('Emulation.setDeviceMetricsOverride', {
              width: 390,
              height: 844,
              deviceScaleFactor: 1,
              mobile: true,
            });
            const ids = (await evaluate(
              `[...document.querySelectorAll('.example-grid > article[id]')].map(card => card.id)`,
            )) as string[];
            for (const id of ids) {
              await send('Page.navigate', {
                url: origin + policy.path + '#' + id,
              });
              await waitFor(
                `document.documentElement?.dataset.appReady==='true' && location.hash===${JSON.stringify('#' + id)} && document.getElementById(${JSON.stringify(id)})?.getBoundingClientRect().top<160 && document.getElementById(${JSON.stringify(id)})?.getBoundingClientRect().bottom>0`,
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
                `location.hash===${JSON.stringify('#' + ids.at(-1)!)}`,
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
            phase = 'client-navigation';
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
        await Promise.all([...pendingInterceptions]);
        if (errors.length) {
          findings.push(
            finding(
              'H07',
              Severity.Error,
              policy.path,
              AuditStage.Render,
              errors.join('\n'),
              'no first-party runtime or browser request failures',
            ),
          );
        }
        const pageFindings = findings.slice(findingStart);
        if (pageFindings.length) {
          diagnosticOnly = true;
          try {
            await captureFailure(policy.path, selector, pageFindings);
          } catch (error) {
            console.error(
              `[render:diagnostics] ${JSON.stringify({ url: productionOrigin + policy.path, error: String(error) })}`,
            );
          }
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
    const diagnostics = browser?.diagnostics();
    findings.push(
      finding(
        'H03',
        Severity.Unknown,
        '/',
        AuditStage.Render,
        String(error) + (diagnostics ? `; Chrome: ${diagnostics}` : ''),
        'available Chrome pipe and local artifact browser audit',
      ),
    );
  } finally {
    await browser?.close();
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
    environment,
    debugPages,
    browser: version,
    optionalServices:
      'All third-party requests blocked; first-party failures remain blocking.',
    rows,
    findings,
  };
  logBrowserFindings(findings);
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
