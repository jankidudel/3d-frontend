import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const DYNAMIC_IMPORT_RECOVERY_KEY = 'inspectmesh-dynamic-import-recovery';

window.addEventListener('unhandledrejection', (event) => {
  if (
    !isDynamicImportFailure(event.reason) ||
    sessionStorage.getItem(DYNAMIC_IMPORT_RECOVERY_KEY)
  ) {
    return;
  }
  // The tab can hold an old Angular entry file while a deployment replaces the
  // current build. Reload once to obtain a matching entry document and chunks.
  sessionStorage.setItem(DYNAMIC_IMPORT_RECOVERY_KEY, 'attempted');
  event.preventDefault();
  window.location.reload();
});

bootstrapApplication(App, appConfig)
  .then(() => sessionStorage.removeItem(DYNAMIC_IMPORT_RECOVERY_KEY))
  .catch((err) => console.error(err));

function isDynamicImportFailure(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason);
  return /failed to fetch dynamically imported module|importing a module script failed/i.test(
    message,
  );
}
