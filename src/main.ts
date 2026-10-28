import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(async (application) => {
    await application.whenStable();
    document.documentElement.dataset['appReady'] = 'true';
  })
  .catch((err) => console.error(err));
