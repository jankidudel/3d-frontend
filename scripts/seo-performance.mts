import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  artifactFiles,
  artifactHash,
  reportDirectory,
} from './seo-artifact.mts';
import {
  AuditStage,
  Severity,
  finding,
  writeReport,
} from './technical-seo.mts';
const findings = [
  finding(
    'P03',
    Severity.Unknown,
    '/',
    AuditStage.Performance,
    'No authenticated GSC/CrUX field data supplied',
    'p75 field LCP/INP/CLS with device, URL/group and observation window',
  ),
];
let rows: unknown[] = [];
let complete = false;
try {
  const render = JSON.parse(
    await readFile(resolve(reportDirectory, 'render.json'), 'utf8'),
  );
  if (
    !render.complete ||
    render.artifactSha256 !== artifactHash(await artifactFiles())
  ) {
    throw new Error(
      'Current complete browser report required. Run npm run seo:render.',
    );
  }
  rows = render.rows;
  complete = true;
} catch (error) {
  findings.push(
    finding(
      'P04',
      Severity.Unknown,
      '/',
      AuditStage.Performance,
      String(error),
      'controlled browser diagnostics for the current artifact',
    ),
  );
}
await writeReport('performance', {
  complete,
  expected: rows.length,
  completed: rows.length,
  findings,
  rows,
  scope:
    'Unthrottled local Chrome diagnostics from isolated first visits, not Lighthouse or field Core Web Vitals. INP is unmeasured; no score or improvement inferred.',
});
process.exitCode = complete ? 0 : 2;
