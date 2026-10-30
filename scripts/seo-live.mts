import { auditRetiredDelivery } from './retired-routes.mts';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { get } from 'node:https';
import { createHash } from 'node:crypto';
import { verifyProduction } from './verify-production-routes.mts';
import { inspectDelivery } from './audit-production.mts';
import { boundedBytes } from './http-documents.mts';
import {
  Severity,
  AuditStage,
  finding,
  writeReport,
  type Finding,
} from './technical-seo.mts';
import { productionOrigin, routeSearchPolicy } from './route-search-policy.mts';
import {
  artifactFiles,
  artifactHash,
  outputDirectory,
  sourceIdentity,
} from './seo-artifact.mts';

const resourceConcurrency = 3;
// One overall request budget bounds discovery without truncating either kind.
const maxResourceRequests = 1000;

export async function auditLiveResources(
  queries: readonly string[],
  assets: readonly string[],
  request: typeof fetch = fetch,
) {
  const findings: Finding[] = [];
  let attempted = 0;
  let completed = 0;
  const resourceRows: Record<string, unknown>[] = [];
  const uniqueQueries = [...new Set(queries)];
  const uniqueAssets = [...new Set(assets)];
  const tasks = [
    ...uniqueQueries.map((url) => ({ url, query: true })),
    ...uniqueAssets.map((url) => ({ url, query: false })),
  ];
  console.log(
    `Live resources: ${tasks.length} URLs (${uniqueQueries.length} query states, ${uniqueAssets.length} assets), concurrency ${resourceConcurrency}.`,
  );
  if (tasks.length > maxResourceRequests) {
    findings.push(
      finding(
        'L04',
        Severity.Unknown,
        '/',
        AuditStage.Live,
        `Resource inventory has ${tasks.length} URLs (${uniqueQueries.length} query states, ${uniqueAssets.length} assets); safety limit is ${maxResourceRequests}. No resource URLs were checked.`,
        'complete resource verification within the request budget',
      ),
    );
    return {
      expected: tasks.length,
      attempted,
      completed,
      rows: resourceRows,
      findings,
    };
  }
  let lastProgress = 0;
  for (let index = 0; index < tasks.length; index += resourceConcurrency) {
    await Promise.all(
      tasks.slice(index, index + resourceConcurrency).map(async (task) => {
        attempted++;
        try {
          if (task.query) {
            const response = await inspectDelivery(task.url, request);
            const path = new URL(task.url).pathname;
            const expected = routeSearchPolicy.find(
              (policy) => policy.path === path,
            )?.canonical;
            if (
              response.status !== 200 ||
              response.raw?.canonical !== expected
            ) {
              findings.push(
                finding(
                  'C03',
                  Severity.Error,
                  task.url,
                  AuditStage.Live,
                  JSON.stringify({
                    status: response.status,
                    canonical: response.raw?.canonical,
                  }),
                  'working declared preset with clean owner canonical',
                ),
              );
            }
            resourceRows.push({
              url: task.url,
              status: response.status,
              canonical: response.raw?.canonical,
            });
          } else {
            const response = await request(task.url, {
              redirect: 'manual',
              signal: AbortSignal.timeout(8000),
            });
            const bytes = await boundedBytes(response);
            const mime = response.headers.get('content-type') ?? '';
            if (
              response.status !== 200 ||
              !bytes.length ||
              /text\/html/i.test(mime)
            ) {
              findings.push(
                finding(
                  'L04',
                  Severity.Error,
                  task.url,
                  AuditStage.Live,
                  JSON.stringify({
                    status: response.status,
                    mime,
                    bytes: bytes.length,
                  }),
                  'existing non-HTML downloadable resource',
                ),
              );
            }
            resourceRows.push({
              url: task.url,
              status: response.status,
              mime,
              bytes: bytes.length,
            });
          }
          completed++;
        } catch (error) {
          findings.push(
            finding(
              'L04',
              Severity.Unknown,
              task.url,
              AuditStage.Live,
              String(error),
              'available public resource',
            ),
          );
        }
      }),
    );
    if (attempted >= lastProgress + 25 || attempted === tasks.length) {
      lastProgress = attempted;
      console.log(
        `Live resources: attempted ${attempted}/${tasks.length}, completed ${completed}.`,
      );
    }
  }
  return {
    expected: tasks.length,
    attempted,
    completed,
    rows: resourceRows,
    findings,
  };
}

/** Keep failure details visible in raw CI logs, with multiline evidence escaped. */
export function logLiveFindings(
  findings: readonly Finding[],
  write: (line: string) => void = console.error,
): void {
  for (const item of findings) {
    write(
      `[live:${item.rule}] ${item.severity} ${item.url} ${JSON.stringify({ observed: item.observed.slice(0, 6000), expected: item.expected, source: item.source })}`,
    );
  }
}

export async function wireSample(path: string, encoding: string) {
  return new Promise<{
    url: string;
    requestedEncoding: string;
    status: number | null;
    encoding: string | null;
    cacheControl: string | null;
    wireBytes: number;
  }>((resolve, reject) => {
    const url = productionOrigin + path;
    const request = get(
      url,
      { headers: { 'Accept-Encoding': encoding }, timeout: 8000 },
      (response) => {
        let bytes = 0;
        response.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 4 * 1024 * 1024) {
            request.destroy(
              new Error('Wire sample exceeds bounded byte limit'),
            );
          }
        });
        response.on('end', () =>
          resolve({
            url,
            requestedEncoding: encoding,
            status: response.statusCode ?? null,
            encoding:
              String(response.headers['content-encoding'] ?? '') || null,
            cacheControl:
              String(response.headers['cache-control'] ?? '') || null,
            wireBytes: bytes,
          }),
        );
      },
    );
    request.on('timeout', () =>
      request.destroy(new Error('Wire request timed out')),
    );
    request.on('error', reject);
  });
}
export async function auditLive() {
  const started = performance.now();
  const findings: Finding[] = [];
  const result = await verifyProduction();
  const expectedPaths = new Set(routeSearchPolicy.map((policy) => policy.path));
  const pageResponses = result.responses.filter((response) =>
    expectedPaths.has(new URL(response.requestedUrl).pathname),
  );
  for (const error of result.failures) {
    findings.push(
      finding(
        'R03',
        result.complete ? Severity.Error : Severity.Unknown,
        '/',
        AuditStage.Live,
        error,
        'complete correct canonical production delivery',
      ),
    );
  }
  const retirement = result.responses.length
    ? await auditRetiredDelivery()
    : {
        rows: [],
        complete: false,
        failures: [
          'Retired URLs NOT_OBSERVED: canonical origin preflight unavailable.',
        ],
      };
  for (const row of retirement.rows) {
    if (row.failure) {
      findings.push(
        finding(
          'R04',
          row.status === null ? Severity.Unknown : Severity.Error,
          row.path,
          AuditStage.Live,
          row.failure,
          'explicitly retired URL returning 404/410',
        ),
      );
    }
  }
  const queries = [
    ...new Set(
      result.responses.flatMap((response) =>
        response.linkEvidence
          .filter((link) => link.query)
          .map((link) => link.url),
      ),
    ),
  ];
  const assets = [
    ...new Set(result.responses.flatMap((response) => response.assetLinks)),
  ];
  const responses = new Map(
    result.responses.map((response) => [
      new URL(response.requestedUrl).pathname,
      response,
    ]),
  );
  for (const response of result.responses) {
    for (const link of response.linkEvidence.filter(
      (link) => link.fragment && !link.query,
    )) {
      let id: string;
      try {
        id = decodeURIComponent(link.fragment!.slice(1));
      } catch {
        id = '';
      }
      if (responses.get(link.path)?.anchorCounts[id] !== 1) {
        findings.push(
          finding(
            'L05',
            Severity.Error,
            response.requestedUrl,
            AuditStage.Live,
            link.url,
            'existing unique fragment in its actual target document',
          ),
        );
      }
    }
  }
  const resources = await auditLiveResources(queries, assets);
  findings.push(...resources.findings);
  let releaseIdentity: unknown = null;
  if (result.responses.length) {
    try {
      const versionResponse = await fetch(productionOrigin + '/version.json', {
        signal: AbortSignal.timeout(8000),
        redirect: 'manual',
      });
      const version = JSON.parse(
        new TextDecoder().decode(await boundedBytes(versionResponse)),
      );
      const expected = await sourceIdentity();
      releaseIdentity = { expected, actual: version };
      if (
        versionResponse.status !== 200 ||
        version.sourceSha256 !== expected.sourceSha256
      ) {
        findings.push(
          finding(
            'R07',
            Severity.Error,
            '/version.json',
            AuditStage.Live,
            JSON.stringify(version),
            'deployed identity matching this verified source',
          ),
        );
      }
      for (const response of pageResponses) {
        const path = new URL(response.requestedUrl).pathname;
        const bytes = await readFile(
          resolve(outputDirectory, '.' + path, 'index.html'),
        );
        const sha = createHash('sha256').update(bytes).digest('hex');
        if (sha !== response.htmlSha256) {
          findings.push(
            finding(
              'R06',
              Severity.Error,
              path,
              AuditStage.Live,
              response.htmlSha256,
              `exact release HTML bytes ${sha}`,
            ),
          );
        }
      }
    } catch (error) {
      findings.push(
        finding(
          'R07',
          Severity.Unknown,
          '/version.json',
          AuditStage.Live,
          String(error),
          'available release identity and local artifact',
        ),
      );
    }
  }
  const transport = [];
  if (result.responses.length) {
    for (const path of [
      '/',
      '/tools',
      '/guides/how-to-hollow-an-stl-file-for-3d-printing',
    ]) {
      try {
        const identity = await wireSample(path, 'identity');
        const compressed = await wireSample(path, 'gzip, br');
        transport.push({ identity, compressed });
        if (!compressed.encoding || !compressed.cacheControl) {
          findings.push(
            finding(
              'P05',
              Severity.Warning,
              path,
              AuditStage.Live,
              JSON.stringify(compressed),
              'eligible compressed HTML with explicit revalidation',
            ),
          );
        }
      } catch (error) {
        findings.push(
          finding(
            'P05',
            Severity.Unknown,
            path,
            AuditStage.Live,
            String(error),
            'measured raw transport bytes',
          ),
        );
      }
    }
  }
  const complete =
    result.complete &&
    retirement.complete &&
    resources.completed === resources.expected;
  const report = {
    stage: AuditStage.Live,
    complete,
    expected: routeSearchPolicy.length,
    attempted:
      pageResponses.length +
      result.unavailable.filter(
        (row) =>
          row.attempted &&
          expectedPaths.has(new URL(row.requestedUrl).pathname),
      ).length,
    completed: pageResponses.length,
    resources: {
      expected: resources.expected,
      attempted: resources.attempted,
      completed: resources.completed,
      rows: resources.rows,
    },
    elapsedMs: Math.round(performance.now() - started),
    releaseIdentity,
    transport,
    findings,
    rows: pageResponses,
    delivery: result,
    retirement,
    artifactSha256: artifactHash(await artifactFiles()),
    sourceSha256: (await sourceIdentity()).sourceSha256,
  };
  logLiveFindings(findings);
  await writeReport('live', report);
  return report;
}
export function liveAuditExitCode(report: {
  complete: boolean;
  findings: readonly Finding[];
}): number {
  if (!report.complete) {
    return 2;
  }
  return report.findings.some((item) => item.severity === Severity.Error)
    ? 1
    : 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = await auditLive();
  process.exitCode = liveAuditExitCode(result);
}
