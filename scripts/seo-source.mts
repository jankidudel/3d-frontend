import { classificationFailures } from './route-coverage.mts';
import { discoverRouter } from './router-source.mts';
import { routeSearchPolicy } from './route-search-policy.mts';
import { isDateOnlyUtc } from '../src/app/features/guides/guide-publishing.ts';
const failures = classificationFailures(discoverRouter(), routeSearchPolicy);
const asOf =
  process.env['GUIDES_AS_OF_DATE'] ?? new Date().toISOString().slice(0, 10);
for (const policy of routeSearchPolicy) {
  if (
    policy.lastmod &&
    (!isDateOnlyUtc(policy.lastmod) || policy.lastmod > asOf)
  ) {
    failures.push(
      `S04: invalid/future date ${policy.lastmod} for ${policy.path}`,
    );
  }
}
for (const error of failures) {
  console.error(error);
}
if (failures.length) {
  process.exitCode = 1;
}
