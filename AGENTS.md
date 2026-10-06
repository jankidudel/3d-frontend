You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## Git Branch and Push Policy

- Never create a new Git branch, including through a worktree or another tool.
- Use the existing `main` branch for implementation. Preserve unrelated staged and unstaged work.
- Never push code automatically. Push only when the user explicitly requests a push.
- A request to implement, fix, merge, validate or deploy does not by itself authorize a Git push.
- Do not automatically delete remote branches; remote changes require an explicit user request.

## Permanent SEO and documentation policies

- Before creating, removing or substantially modifying public or indexable pages, read the workspace's [authoritative SEO strategy](../docs/SEO_STRATEGY.md). Apply its duplicate-intent, unique-value, sourcing and functional/editorial acceptance gates in every relevant batch.
- Change that strategy only when long-term policy changes, not after each execution batch.
- When materially changing a public page, maintain its sitemap modification date: use `scripts/editorial-dates.mts` for non-guide pages and the guide registry's `updatedDate` for guides. New pages need a recorded date. Preserve dates on unchanged pages and never replace them with build time.
- Follow the workspace's [documentation governance](../AGENTS.md#documentation-governance): keep durable documentation and research, remove clearly completed temporary batch inputs after implementation and validation, and report work in the final Codex response instead of a new Markdown report. Preserve active or uncertain files and never commit completed temporary handovers with an implementation.

## TypeScript Best Practices

- Use strict type checking
- Use explicit `{}` blocks for every `if`, `else`, loop, and other control-flow
  body, including single-statement bodies. Do not write braceless control flow.
- Put every control-flow condition, opening brace, body statement, and closing
  brace on its own appropriate line. Never compress an `if`, `else`, loop,
  `switch` arm, `return`, or other statement into a single line.
- Every `if` and `else` body must use braces, even for exactly one statement.
  For example, write `if (condition) { ... } else { ... }` as multiline blocks;
  never write an unbraced `if (condition) statement;` or `else statement;`.
  For example:
  ```ts
  if (!sourceOnly) {
    await checkGeneratedOutput();
  }
  ```
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
- Prefer named constants for repeated domain and configuration values; do not hardcode them in production code. For string-literal domains, use the TypeScript value-plus-type pattern: `export const JobStatus = { Created: 'created' } as const; export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];`.
- Never declare a string-literal union for a domain state or repeat a domain-state literal in production code. Export a value-plus-type constant first, then use its named members in records, comparisons, and control flow.

## Writing Style

- Use a normal hyphen (`-`). Do not use en-dash or em-dash characters in user-facing copy, code comments, documentation, or responses.
- At the end of every completed task, report which user-facing pages were added and which existing user-facing pages were updated. State explicitly when neither applies.
- Use `https://www.inspectmesh.com` as the base URL when reporting user-facing page URLs.

## Formatting

- After completing frontend changes, run `npm run format` to format the affected repository files with Prettier before handing off the work.

## Dependency Management

- Always use exact versions in `package.json`; do not use semver ranges such as `^`, `~`, `>`, or `*`.
- When adding or updating a package, pin the exact resolved version and update `package-lock.json` in the same change.
- Use `npm install --save-exact <package>` or `npm install --save-dev --save-exact <package>` for new dependencies.
- When a JavaScript dependency lacks bundled TypeScript declarations, prefer its
  maintained `@types` package as a development dependency over a local ambient
  declaration shim. Keep `@types/node` as a direct development dependency for
  Node-based scripts.

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- In authored guide HTML, use `{{ GuideSlug.Route... }}` for every internal
  link. Do not add root-relative literal routes, so route changes and internal
  link validation stay centralised.
- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection
