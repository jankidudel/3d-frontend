# SEO evidence and release operations

The workspace's [SEO strategy](../../docs/SEO_STRATEGY.md) is authoritative. This document explains how to maintain evidence, not how to manufacture an indexed-page target. Preserve existing useful pages and source dates. Routine new SEO publication is paused during the recovery review; necessary product and factual fixes can continue.

## URL ledger

Maintain [seo-url-ledger.json](seo-url-ledger.json) as the canonical URL decision and measurement record. Its starting inventory is the 195-route sitemap from 24 October 2026. Each route has an assigned family, primary task, retained-content evidence, a reason for its disposition, local checks, independent live delivery fields, Google fields and release fields. Null means unknown. A local pass is neither a production GET nor evidence of Google indexing.

After a production build, run:

```sh
npm run seo:audit -- --write
```

The audit checks complete ledger/sitemap coverage, initial self-canonical/H1/metadata/content, robots directives, crawlable links, contextual inlinks and shortest link depth. It records content hashes and preserves prior local evidence when the answer changes. This checks presence and consistency; it cannot assess helpfulness from text length or establish equivalence to Google's rendering. Review page-specific task/evidence manually. Keep per-page unchanged dates unchanged.

From an environment with production access, run:

```sh
npm run seo:audit:production -- --write
```

This is a compatibility command for `seo:verify-production`, which now also checks sitemap trees, robots access and link-discovered pages. Attempts are stored under `productionRouteCoverage`; existing per-page live evidence is preserved. It makes bounded read-only GET requests, without spoofing Googlebot or changing hosting. Review canonical URLs, redirect hops, HTTP robots and content type. An intentionally missing route must return a real 404. Exported redirect-error variants need a separately scoped investigation; the automatic verifier does not generate query permutations or identify Google's affected URLs. Do not replace a previous successful observation with an invented status when access fails.

Raw GET and browser-rendered checks remain separate. Compare canonical, robots, title, H1, explanatory content and links after hydration. Inspect mobile and desktop uploads, long result lists, focus visibility, horizontal tables, error/cancel states and real downloads. Capture only public fixture states for technical evidence. Browser inspection that cannot run is an unverified check, not an inferred pass.

The ledger's `recoveryBaseline` holds the fixed 12-page recovery cohort, supporting browser observations, public sitemap/robots observations and explicit access dependencies. The cohort selection is provisional until current Google and usage evidence identifies existing winners; keep its denominator stable and document any justified replacement. Individual `rendered` observations record settled DOM signals and their agreement with the local build. They do not establish initial HTML, physical layout, tool execution, indexing or a deployment date. Routine new search landing pages are paused through 7 December 2026 under this six-week recovery programme; this date neither schedules publication nor overrides the strategy's recrawl and 28-day evaluation gates.

## Search Console and protected pages

Import dated Page indexing examples, indexed URLs, Sitemaps and Performance exports from the correct property. Retain the original exports as research. Populate each row's `google` object with its actual status/reason, selected canonical, last crawl and page/query/country/device window. Record export/property scope. Preserve requested URL variants in `additionalUrls`; do not collapse them into canonical rows without retaining their original identity. A historical impression is not proof of current indexing.

Identify the existing indexed cohort before approving any consolidation or exclusion. Inspect affected URLs and their historic performance, direct usage and links. Missing credentials or exports leave those fields unknown; do not assign the screenshot's sitewide count to invented URLs. Check Manual actions, Security issues and Crawl Stats in the authenticated property. A successful live inspection is not an indexing decision.

Record any proposed move, redirect, removal or noindex separately in `indexationChanges`, with destination, rationale, preserved unique content, evidence, review and rollback. The starting value is an empty list. Overlap candidates stay accessible pending evidence; neither an appendix suggestion nor an unindexed label approves a removal. Existing host normalization is distinct from a new content redirect.

## Reproduce examples

From the frontend root:

```sh
node --experimental-strip-types scripts/generate-recovery-evidence.mts
npm run test:seo-recovery
```

To intentionally refresh the local preflight observation after reviewing an algorithm change:

```sh
INSPECTMESH_REFRESH_EVIDENCE=1 npm run test:seo-recovery
```

From `3d-processor`:

```sh
dotnet run --project tools/RecoveryEvidence -- ../3d-frontend/public/examples
dotnet test 3d-processor.slnx --nologo
```

The runner checks the one/repeated-item 3MF build, defective resource and reopened STL cleanup. `public/examples/quality-evidence/provenance.json` records input hashes, reduction outputs, versions, rights and scope. The keyed-cylinder SVGs are projections of serialized geometry, not browser screenshots. New analytical geometry is CC0. Existing fixtures retain their provenance. Samples and local processor observations do not establish production deployment, slicer compatibility or a physical print outcome.

Keep .NET's socket-based test runner limitation distinct from a test failure or successful run. A successful direct evidence runner checks its listed controls, not the full test suite.

## Release and measurement

### File handoff and interior evidence

`python3 scripts/generate-handoff-assets.py` regenerates the owned OBJ/MTL/PNG
bundle, its inventory, explanatory figures and blank receiving CSV. The fixed
ZIP timestamps and blank evidence cells are intentional. Run
`INSPECTMESH_REFRESH_EVIDENCE=1 npx vitest run scripts/file-handoff.spec.mts`
to capture the existing scoped converter's saved bytes and local topology
observations. Ordinary test runs compare the retained geometry and reports
without changing dated observations. No runtime duration is part of equality.

After building the existing processor, run
`python3 scripts/capture-handoff-processor.py`. This separately captures the local
processor code path on the one/two-placement cubes and closed/open/passage STL
controls. It never submits a production job. The record retains source hashes,
processor revision and method-source hashes. Analytical sums remain distinct
from unavailable multi-component processor volume.

The optional receiver experiment is
`Blender --background --python scripts/capture-obj-receiver.py`, using a suitable
Blender executable. It imports the complete bundle and a temporary copy missing
the texture, and records actual imported-scene renders. Startup failed in this
execution environment on 27 October 2026 before import, in Metal device
initialisation. Accordingly, public receiver appearance remains untested; the
reference diagram is not a screenshot or captured import. A later successful
capture requires editorial review before publishing any receiver claim.

The ledger's `fileHandoffReview` retains route obligations and a separately
labelled six-page observation group. It does not replace `recoveryBaseline`,
`clarityCohort` or prior release evidence. Release and Google fields remain
unknown until observed after an authorized deployment.

Before an authorized deployment, complete `npm run verify`, the processor checks for relevant changes, editorial/source review and representative browser review. Resolve demonstrated failures. Identify exact changed canonical URLs, meaningful dates and source changes. Use the ledger's previous content hash and source Git history as the baseline, and store deployment/recrawl dates only after observing them.

Implementation does not authorize a push, deployment, production object deletion or cache invalidation. This workflow adds no AWS resource, log stream, alarm, WAF rule or managed service. Production crawl requests use the site's ordinary request/data-transfer allowance; deployment and any invalidation need their own cost review and authorization. Do not change edge rules solely because a local network cannot reach the site.

After deployment, verify actual GETs, rendered state, fixtures, sitemap and Google live tests. Request indexing only for selected substantively changed priority URLs where appropriate. Review technical regressions promptly, then relevant page/query impressions, clicks, CTR and privacy-respecting task completion weekly. Compare comparable periods and actual post-update crawl dates; follow the strategy's full 28-day evaluation convention before another broad overlapping release. Do not repeatedly rewrite pages that Google has not fetched yet. Indexing and useful customer activity are separate outcomes.

## Documentation maintenance

Audit tracked Markdown case-insensitively in the workspace and each component. Keep active instructions, durable architecture/testing/setup/operations and user-owned research. Preserve ambiguous files for review. The ledger's documentation audit records those classifications and evidence; do not delete a file because its name suggests scratch work. Remove a batch input only after its implementation and validation are complete, and update references if a file is removed. Never retain a new completion-report Markdown file in place of the final task response.

## Independent route coverage and production verification

`npm run build` includes `check:route-coverage`; the normal `verify` and deployment prerequisites therefore use the same network-free gate. `npm run test:route-coverage` tests the router independently of the search policy, including an added unclassified public hub. No workflow trigger or deployment stage is added.

The reader in `scripts/router-source.mts` walks actual router declarations, nested arrays, finite catalogue mappings and supported lazy child exports without importing Angular or executing components. Only explicitly allowlisted pure catalogue modules execute in its isolated data loader. New unresolved route expressions, matcher patterns or data imports fail with their source location. The published guide matcher is resolved through its existing generated finite slug registry; `**` remains a separately recorded not-found handler. No upload, job/result, account or private-file route exists in the current concrete router; transient tool state does not create sitemap URLs.

`scripts/route-search-policy.mts` adapts the established canonical public list and published guide data rather than introducing another hand-maintained slug list. It also records the existing exclusions: privacy/cookies remain navigable, self-canonical and indexable but intentionally absent from the sitemap; the unpublished printer review and 404 document retain noindex and no canonical. Exclusion from the sitemap does not itself mean noindex. A change to these decisions needs its own editorial review.

Run `npm run check:route-coverage -- --write` after a production build to store one inventory in `docs/seo-url-ledger.json`. Existing page rows receive `routeCoverage`; excluded documents and the summary live under the ledger's top-level `routeCoverage`. The sets are concrete router paths (R), generated page paths (G), linked same-site page destinations (L), parsed sitemap records including duplicates (S), and intended canonical sitemap owners (I). The report includes all six differences, source/render locations, dates and their source, incoming/contextual counts, homepage reachability and query-state diagnostics. Root and intentional error/draft orphans are distinct from an unreachable public tool. Exact XML membership is checked before deduplication. Paths retain case and reserved encodings; query states are recorded but are not new canonical pages. Same-page and cross-page fragment targets use the built-link validator.

Run `npm run seo:verify-production -- --write` separately for read-only HTTP evidence. It fetches robots.txt, the canonical sitemap (including bounded indexes and gzip children), all known public pages, ordinary linked HTML destinations and one deliberately nonexistent URL. Limits are three concurrent page requests, 240 page documents, 20 sitemap documents, 1,000 sitemap entries, 500 discovered links per page, eight redirect responses and five-second request timeouts. Compressed and decompressed documents are limited to 4 MiB. Truncation is explicit. Query permutations, asset links and private/transient endpoint shapes are recorded without fetching. This creates only ordinary hosting requests, with no AWS resources, uploads, forms, processing jobs or account actions.

The production attempt is saved independently under `productionRouteCoverage`; it never replaces Google evidence or a previous successful per-page delivery observation with a guessed status. DNS/network failure records null status/final URL and the environment limitation. It does not diagnose an outage. Public metadata, response headers, applicable Googlebot robots rules and redirect chains are evidence of delivery only; browser hydration, source release revision, production object cleanup and Google indexing remain separate checks. Rerun after an authorized release before describing a local correction as deployed.

The same verifier also runs seven fixed host/protocol/slash/index/query/missing-path diagnostics, separately from canonical pages and from unknown GSC redirect-error examples. It records redirect headers and retains observed hops when a later fetch or loop fails. Query preservation, final HTTPS www origin and the intended canonical are checked; serving a slash or index variant under its own URL is acceptable when it consistently identifies the clean owner. No hosting change is implied by a multi-hop redirect alone.

Initial HTTP observations include extracted main text and the HTTP `Link` header. Conflicting HTTP canonicals and identical main documents across different intended owners are flagged for investigation. This is a diagnostic, not approval for consolidation. The verifier deduplicates the same-origin scripts and styles actually referenced by initial HTML, resolves the document's base URL, and checks up to 80 resources with three concurrent requests and the existing timeout/byte bounds. Missing, empty, redirected or incorrectly typed assets fail verification; imported/lazy chunks and functional hydration still require representative browser checks. Successful canonical GET observations update the matching ledger row's `live` fields while preserving separate rendered evidence. Failed attempts retain previous successful observations and remain visible in the current attempt record.

## Technical SEO gate and Git hooks

Official guidance reviewed 27 October 2026. The maintained rule catalogue is
[`scripts/technical-seo-rules.json`](../scripts/technical-seo-rules.json). It
separates Google eligibility from local delivery contracts. Exactly one H1,
initial content, link depth and duplicate-title policies are engineering checks;
none guarantees indexing. Article author/image are recommendations. FAQPage
presence and FAQ counts are optional; visible questions remain useful. See
[Google technical requirements](https://developers.google.com/search/docs/essentials/technical),
[Article guidance](https://developers.google.com/search/docs/appearance/structured-data/article),
and [feature updates](https://developers.google.com/search/updates).

| Command                   | Contract                                                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run hooks:install`   | Configure this repository only; refuse conflicting hook paths or existing uncombined hooks                                                               |
| `npm run seo:staged`      | Copy the Git index into a disposable directory; validate staged routes, guide data and dates without formatting/stashing/staging working files           |
| `npm run seo:source`      | Source-only policy and independent router classification, intended for the isolated index snapshot                                                       |
| `npm run seo:build`       | One production build, existing checks, HTML and route reconciliation                                                                                     |
| `npm run seo:html`        | Reconcile the router, policy, output, graph, sitemap, metadata, schema, fragments and first-party resources                                              |
| `npm run seo:render`      | Chrome renders all finite public documents at 390px, desktop family samples, Examples click/direct/history navigation and cross-family client navigation |
| `npm run verify:push`     | Tests, build and static SEO checks; no browser or artifact seal                                                                                          |
| `npm run seo:check`       | Full deployment `verify`: push checks, browser gate and artifact seal                                                                                    |
| `npm run seo:artifact`    | Require the current source and every artifact byte to match the sealed release                                                                           |
| `npm run seo:live`        | Bounded production GET inventory, known linked queries/downloads, fragments, transport samples and release identity                                      |
| `npm run seo:performance` | Current local browser timing diagnostics; field evidence remains explicitly unknown                                                                      |

Install hooks after clone and verify `git config --local --get core.hooksPath`
returns `.githooks`. Pre-commit reads staged blobs, including partial staging,
spaces, deletions and renames; an unmerged index fails. It never auto-formats or
changes the real index. No docs-only shortcut is used, avoiding an incomplete
dependency classifier. Pre-push reads ref/SHA pairs from stdin and checks each
unique outgoing commit in an isolated snapshot, including non-current branches,
new/force updates and commit tags. Deleted refs are skipped; non-commit tags and
unsupported refs fail explicitly. No branch is created. Snapshot checks need
already installed, matching lockfile dependencies and use no production network.
Hook inputs and checks are not cached, so an unrelated prior pass cannot certify
a new source. Local pushes run the deterministic source/build checks, without
requiring Chrome or issuing a release seal. Browser availability must not prevent
source from reaching the manual deployment workflow. `npm run verify` still
requires the browser audit and artifact seal before any deployment upload. Local
hooks can be bypassed; deployment verification is mandatory.

Chrome is required (`CHROME_BIN` may select its executable). The browser auditor
uses the Chrome DevTools pipe, fulfills every first-party request from the same
build and blocks third-party requests. It submits no forms or production jobs.
No localhost listener, remote debugging port or browser-driver download is
required. A missing browser/environment failure is incomplete, never a pass.
`data-app-ready` is set after Angular stabilizes; the gate still compares source
and hydrated canonical, title, directives, component identity and main headings.
The gate does not replace functional tool tests or physical print verification.

Reports are JSON and CSV under ignored `tmp/seo`, with rule/severity, exact URL,
evidence, correction, scope counts, timing and source/artifact hashes. The
manual deployment workflows preserve them as job artifacts even on failure.
They are execution output, not tracked completion reports. Exit 0 means complete
with no blocking errors, 1 means deterministic failures, 2 means incomplete or
unavailable audit evidence. WARN/UNKNOWN remain visible. Search Console,
verified Googlebot logs and field performance require owner evidence and remain
unknown until supplied; local rendering cannot establish Google indexing.

`version.json` includes the source/lockfile hashes. The release seal hashes every
built file and requires successful HTML/browser reports for those exact bytes.
The frontend uploader rechecks the seal immediately before S3 upload; deploy-all
also rechecks before CDK. Hashes prove equality to this local artifact, not
identity of Google's selected canonical or trust in a supplied external file.
Both workflows remain manual and verify production after upload. A failed live
audit makes deployment unhealthy; inspect evidence and use the existing reviewed
redeployment process. Automatic deletion, rollback or invalidation is not added.

### Debugging a failed browser audit

The console prints every blocking finding with its rule, exact URL, observed
value and expectation. `[render:page]` adds the phase, navigation result, loaded
URL, document readiness, Angular readiness marker, heading, viewport and a short
main-content excerpt. The environment line records Node/Chrome, OS/architecture,
CPU/memory, worker count and GitHub run identity, without dumping environment
variables. Compare these fields between local and CI runs.

The existing `technical-seo-prod` workflow artifact includes `render.json`,
`render.csv` and `failed-pages/`. Each failed page has a JSON diagnostic with
recent fulfilled, blocked and failed requests and runtime errors. The first
eight failed pages also receive a viewport PNG and up to 512 KiB of HTML.
Only this isolated public build is captured; no private uploads or forms are
submitted. The complete findings remain in JSON/CSV even when console evidence
is abbreviated. Diagnostic capture failures do not turn a failed audit into a
pass. Chrome startup failures still exit as incomplete.

The readiness probe waits for the requested pathname and a non-null document
root before reading the readiness marker. Execution-context turnover caused by
navigation may be retried; application exceptions remain failures. This is a
browser-runner correction, not a relaxation of the SEO checks.

### Hosting compression, caching and cost boundaries

HTML uses AWS's managed `CachingDisabled` policy. The CloudFront Free plan rejected
the custom policy that enabled gzip/Brotli, so it was removed. Documents remain
fresh, but HTML compression is unresolved and the live audit reports it as an
advisory finding. JavaScript and CSS retain managed `CachingOptimized` caching. See
[AWS compression conditions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html).
The existing CDK bucket upload now preserves explicit revalidation metadata
rather than clearing it. Infrastructure uploads conservatively revalidate all
files; the frontend-only uploader retains its year-long immutable policy for
content-hashed chunks and uploads those before documents. Old chunks remain.
Stable examples, HTML, robots and sitemap are never marked immutable.

This adds no custom cache policy, pricing-plan change, service, log stream, WAF rule,
custom uploader, invalidation or fixed recurring charge.
Infrastructure-wide revalidation can increase conditional asset
requests compared with the frontend-only immutable cache; ordinary S3/CloudFront
requests, transfer, artifact retention and deployment charges still apply.
Authorize infrastructure deployment separately and inspect actual response
encoding, Cache-Control, ETag/304 and raw byte samples after release. Source
configuration alone does not prove an edge location is updated.

The HTTP apex two-hop redirect is advisory: the existing distribution enforces
HTTPS before the apex function redirects to www. Removing that hop requires a
reviewed hosting design change, rather than weakening transport policy or
inventing a scheme header. It remains measured by the live variant checks.
Do not create a second distribution or redirects solely to make this warning
green without separate cost/design authorization.
