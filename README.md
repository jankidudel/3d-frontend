# 3dFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.3.

Use a Node.js version supported by Angular 22. With nvm, run `nvm use`; the repository currently pins Node 24.19.0 in `.nvmrc`.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

The deployable static files are written to `dist/3d-frontend/browser`. The sibling
`3d-infra` project deploys this directory to a private S3 bucket behind CloudFront.
CloudFront forwards `/api/*` to API Gateway, so the frontend keeps the same-origin
API base URL `/api/v1` without environment-specific URLs or browser API CORS.

## Search indexing and SEO

Read the workspace's [permanent SEO strategy](../docs/SEO_STRATEGY.md) before public-page changes. It is the authoritative policy for intent ownership, evidence, quality gates and release measurement. Follow [documentation governance](../AGENTS.md#documentation-governance) for temporary execution inputs.

Run `npm run hooks:install` after cloning. The staged-file, outgoing-commit and
mandatory deployment checks are documented in [SEO operations](docs/SEO_OPERATIONS.md#technical-seo-gate-and-git-hooks).

The [technical evidence record](docs/english-market-batch/EVIDENCE.md) preserves reproducible geometry controls, slicer experiments and their limitations. It is research documentation, not a release handover.

Every production sitemap entry includes a persistent `lastmod`. For a material change to a non-guide page, update its entry in `scripts/editorial-dates.mts`; for a guide, update `updatedDate` in `src/content/guides/guides.registry.ts` (new guides use `publishDate`). Builds preserve these dates. Existing pages without recorded dates received the one-time baseline `2026-10-06`; this is not a claim that their content was revised that day. New non-guide pages require an explicit date, and sitemap generation fails on missing or invalid dates. Mere rebuilds, formatting or unrelated code changes must not advance page dates.

All public routes are prerendered and receive their title, description, robots
directive, and (when configured) canonical URL through the central SEO service.
Hosted deployment is production-only. Local development remains deliberately
noindexed and does not emit a canonical URL. The development build remains available
for local testing. The dormant `deployment-development` configuration and
`build:deployment-development` script preserve the optimized, noindex hosted-development
build for future use. Neither is used by the current deployment workflows.

Before enabling production indexing, update
`src/environments/site-config.production.json` with the final custom HTTPS origin
(without a trailing slash) and set `indexingEnabled` to `true`:

```json
{
  "siteUrl": "https://your-final-domain.example",
  "indexingEnabled": true
}
```

The production build then creates an absolute canonical for every public route,
an `index, follow` robots directive, `robots.txt`, and `sitemap.xml`. Leave both
settings as they are until the custom domain is live. The CloudFront URL must not
be used as `siteUrl`.

The manually dispatched `deploy-frontend` workflow uses the protected `prod` GitHub
Environment. It runs the ordered `npm run verify` phases once and uploads that verified production
build directly to S3, without rebuilding it or running a CDK bucket-deployment
Lambda. Use `deploy-all` in `3d-infra` for coordinated application releases.

## Verify a deployed frontend release

Each build includes a non-UI release marker containing the frontend commit and
build timestamp. Open `/version.json` on the deployed site. This marker contains
no user, job, or analytics data, and is not loaded by the application.

After an upload, the quality-check page polls with bounded backoff until the S3-backed
API reports `completed` or `failed`. Manual refresh remains available if polling is
interrupted.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Quality checks

Run Angular and TypeScript linting with:

```bash
npm run lint
```

Run the complete local/CI verification suite (linting, tests, and the production SSG build) with:

```bash
npm run verify
```

Enable the repository-managed pre-commit hook once after cloning:

```bash
npm run hooks:install
```

The pre-commit hook formats files, then runs linting and unit tests. If
formatting changes files, the commit is stopped so you can review and stage
them. A pre-push hook runs the production SSG build, avoiding duplicate
compilation on every commit while still checking the deployable artifact before
code leaves the machine.

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

# Product analytics events

SEO ownership, the 195-URL evidence ledger, production GET checks and release
measurement are documented in [SEO operations](docs/SEO_OPERATIONS.md).

With analytics-cookie consent, the existing GA4 integration records these
privacy-limited product events:

- `stl_upload_started`: `tool`, `file_size_bucket`
- `stl_upload_completed`: `tool`
- `stl_analysis_completed`: `tool`, `validation_result`,
  `issue_count_bucket`, `triangle_count_bucket`
- `stl_analysis_failed`: `tool`, `failure_category`
- `stl_report_downloaded`: `tool`, `format`
- `stl_scale_calculated`: `tool`, `target_dimension`
- `stl_printer_fit_checked`: `tool`, `fit_result`
- `stl_material_estimate_used`: `tool`, `material`

The frontend sends allow-listed categories and aggregate buckets only. It does
not send filenames, job IDs, report contents, raw geometry or calculator values,
storage paths, or server error messages. Events no-op before consent and after
consent is withdrawn.

## Customer quotation workflow

`/3d-printing-quote-generator` prepares a customer document from a reviewed order selling price. Production cost is transferred to `/3d-printing-price-calculator` in job-total mode once; planned quantity is context, not a second multiplier. The calculator retains the authoritative margin/markup, fee and minimum formulas and its separate internal pricing worksheet. Quotation handoffs are cloned historical snapshots held in `QuotationSession` memory.

The quotation editor uses Angular signal forms. `customerQuotation()` is the only public document projection; preview and PDF take that projection, never the raw draft or internal assumptions. Charges round to integer cents once per displayed order/delivery charge. No tax, unit-price allocation, model inspection or acceptance is inferred. The source status remains unverified and sample status persists in the document.

Drafts are in tab memory by default. Single-draft browser storage retains the `inspectmesh-customer-quotation-v1` key for compatibility; its envelope now uses the v2 schema and reads previous v1 drafts. Reopen is explicit. Clear removes the current draft and quotation-family records; the business profile and other tools remain separate. Downloaded editable JSON can include private pricing and customer details. Imports validate the version, 1 MiB budget, bounded text, supported currencies, dates, quantities, money and historical pricing assumptions before replacing state. PNG/JPEG logos are signature-checked, decoded and constrained to 1 MiB / 4 megapixels; imported and saved logos are decoded again before use. Combined drafts exceeding 1 MiB are rejected. No remote logo, SVG or model upload is accepted.

Business profiles allow only business name/email/address, logo and payment instructions. The separate `inspectmesh-business-profile-v1` key is written only by Save business profile. Apply is explicit and confirms populated field replacements; removal leaves the editor and quotes intact. Serialized profiles and individual drafts each have a 1 MiB UTF-8 budget.

Quotation families live in tab memory, with at most ten retained immutable snapshots and a 4 MiB archive budget. `inspectmesh-quotation-family-v1` persists only on explicit Save quotation versions, with no autosaving of later changes. Archives reconstruct allowlisted customer projections, validate nested drafts and parent identity/number consistency, and reject cycles, duplicates and cross-family links atomically. A standalone revised draft can be reopened without inventing its unavailable ancestors; its explicit archive history root distinguishes this partial history. Import an archive to restore all earlier records. Retained previews and PDFs never replace the current editor. Every source requires price/scope review, and revised exports also require a change summary. Changes clear review and previews; specification edits warn that prices have not been recalculated. Repeated calculator offers show old/new amounts, quantities and currency before applying only pricing context; currency changes require acknowledgement without conversion.

The existing jsPDF engine generates selectable customer text using bundled Liberation Sans fonts under their included OFL license. Unsupported font characters produce an actionable export error rather than corrupt output. PDF export keeps totals together, wraps long text and repeats continued-section labels and page numbers. Consent-gated quotation events contain only source category, reviewed state and sample status. No quotation values, names, filenames, JSON or form contents are sent to analytics. This editor does not wrap its fields in an auto-submitting form, and GA automatic form interaction collection is disabled in configuration.

Run `npm run verify` for the existing regression suite, including quotation projection, rounding, handoffs, draft bounds, storage failure and inert rendering tests. A browser acceptance run must additionally open real PDFs and reparse downloaded JSON, check sample/manual/imported flows, local save/reopen/clear and denied storage, narrow layouts and long multi-page text with a logo. This local builder does not provide paid plans, hosted approval, accounts or production management.

### Verification phases

`npm run verify` runs these phases in order: `verify:prepare`, `verify:source`,
`verify:tests`, `verify:build`, `seo:render`, `seo:artifact:seal`. Deployment workflows
show each phase as its own step. Guide content is generated once, all script specs
run in one Vitest invocation, and the combined HTML audit includes route coverage
and internal-link validation. Standalone lint, type-check, test and build commands
still prepare their own generated input. `verify:push` runs the first four phases;
browser rendering and artifact sealing remain mandatory before deployment.

If GitHub displays stale steps or no live output, open **View raw logs** from the
job menu before cancelling. The workflow reports runner startup and uses separate
limits for tests, builds and browser verification. Upload logs show each publication
phase and completed file counts without changing cache headers or uploading HTML
before its referenced assets.
