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

All public routes are prerendered and receive their title, description, robots
directive, and (when configured) canonical URL through the central SEO service.
Temporary and development deployments are deliberately noindexed and do not emit
a canonical URL, so a CloudFront distribution URL cannot become a search result.

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

The pre-commit hook runs linting and unit tests. A pre-push hook runs the production SSG build, avoiding duplicate compilation on every commit while still checking the deployable artifact before code leaves the machine.

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

# Product analytics events

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
