# English-market development batch

This implementation adds six working browser-local tools and six authored guides. Forty-five existing URLs received page-specific worked examples, interpretation and contextual workflow improvements; homepage discovery brings the changed-existing total to forty-six. Guide outcomes are twenty-one distinct pages: fifteen rebuilt and six new. No public URL was removed or redirected.

Development delivery completed at [the existing protected preview](https://daau2p33m8op4.cloudfront.net), from source commit `5fa0510d984dbe03cc91e3962738a95ac7a9da4a` on `codex/english-market-seo-batch`. All 294 uploaded files match the build by size and MD5 ETag; all 58 new/changed routes returned the existing unauthenticated 401 challenge. Twelve public entry assets matched the build through CloudFront. Production was not deployed.

## Review assets

- `public-page-audit.json`: all 164 rendered assets, including 160 sitemap canonical pages, two legal utilities, the existing noindex printer-review draft and the 404 page. Titles, descriptions, H1s, canonical/indexability, links, source evidence, actions and dispositions are recorded. The four assets outside the sitemap are explicitly accounted for.
- `keyword-ownership.json`: all 120 seeds, exact primary owner, task and country/demand evidence boundary. Variants share an appropriate owner.
- `topic-brief-outcomes.json`: all 25 brief decisions. The exact brand-spool tare dataset is deferred for lack of reliable measured variants; the working custom-tare calculation is complete.
- `changed-public-urls.json`: exhaustive new/changed canonical production URL lists. These identify route ownership; the batch is delivered to development only.
- `EVIDENCE.md`, `fixtures/`, `node-benchmarks.json`, `screenshots/`: owned controls, actual slicer exports and observed browser/numerical results.
- `deployment-verification.json`: the actual delivery target, source version, completed checks and precise limits.

## Available features

| Capability                                                                  | Free workflow                                                                                      | Isolated development preview                    |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Single-file tools and all four planners                                     | Available                                                                                          | Available                                       |
| Collection allowance                                                        | Three files                                                                                        | Twenty files when preview is explicitly enabled |
| Per-file budget                                                             | 5 MiB / 100,000 triangles; 20 MiB expanded 3MF                                                     | Same                                            |
| Consistent JSON/CSV and printable reports                                   | Available                                                                                          | Available                                       |
| Optional browser-local report history                                       | Available, original file bytes excluded                                                            | Same                                            |
| Spatial comparison                                                          | Overlay, explicit translation, 5,000 surface samples per direction and conservative volume screens | Same                                            |
| Paid billing, account entitlements, cloud projects and cross-device history | Unavailable                                                                                        | Unavailable                                     |

The preview is fenced by the development build configuration. Production output has no preview toggle or benchmark control. It is an offer experiment, not a paid entitlement or checkout. Existing newsletter subscriptions are not paid subscriptions. Paid subscription events are intentionally not fabricated.

Currency and retailer region choices are remembered where browser storage is available. GBP, USD, CAD, AUD, NZD, EUR and ZAR are offered without invented exchange-rate conversions. Technical pages are shared across English-speaking markets; no nonexistent country variants or hreflang pages were created.

The structured manufacturer-referral component carries reason, compatibility limits, exact source, reviewed date and regional URL slots. No affiliate programme IDs or commissions are configured. Manufacturer events are distinct from affiliate events. A regional locale is not stock or shipping evidence.

## Validation and limits

The baseline `npm run verify` passed before edits. The final run includes formatting, lint, script types, application and supporting tests, production prerender, SEO and internal links. Advisory title/description/length notices are not guarantees or release failures. Exact final counts and live checks are in the release record.

Analytics additions reuse consent and stripped landing paths. They contain static tool identifiers and coarse usage buckets; filenames, model bytes, precise mesh dimensions, financial inputs and user-entered profile text are not analytics parameters. Local/exported reports can contain filenames and findings, as stated in the UI.

The development frontend upload uses the existing script: hashed assets first, mutable assets next, HTML last, old hashes retained. No infrastructure, cache behavior, WAF, logs, invalidations or production resources are changed. Expected incremental AWS impact is S3 object storage and upload requests plus ordinary development CloudFront requests/data transfer. No new recurring resource is provisioned.

Authenticated live-page inspection requires the existing development login. Automatic approval review rejected retrieving the Basic Auth value from the live CloudFront function because credential extraction was not explicitly authorized. This does not block the authorized frontend deployment; uploaded-file integrity and the unauthenticated login challenge can be verified without extracting a secret.

## Reproduce evidence

From the frontend root, run `python3 docs/english-market-batch/fixtures/generate-fixtures.py` for the owned model controls. Slicer commands and retained settings are in `EVIDENCE.md`.

For Node observations, bundle the two TypeScript modules with the existing esbuild dependency and pass their absolute output paths to `fixtures/benchmark-node.mjs`, followed by an output JSON path. The original report is dated to its actual run; do not replace historical evidence silently. New runs have their own device/runtime context.

The inventory generator accepts a JSON export of `canonicalPublicRoutePaths`, `PublicRouteUrl`, generated `guideRoutePaths` and `guideRegistry`, then the supplied handover path. It reads the current production prerender and writes all audit/mapping outputs; it asserts that every primary owner exists.

## Production release checklist

1. Review the six workflow controls, supporting content and explicit limitations in the protected development preview.
2. Supply GSC/Keyword Planner exports for the requested country group/window before treating the provisional task ranking as measured demand. A location-controlled top-ten study is still unobserved.
3. Review browser performance on representative lower-memory hardware; the phone viewport screenshots are layout checks on this computer.
4. Confirm real paid authentication/billing/entitlements and any cloud retention promises before changing the preview into a production paid offer. They are outside this frontend batch.
5. Configure approved affiliate programmes and verify exact regional destinations/availability before treating manufacturer referrals as commission-generating placements.
6. Authorize a separate production release. Use the production build, recheck production canonical/sitemap/indexability and retain the existing cache-safe upload order.
