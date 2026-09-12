import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const siteKey = process.env['TURNSTILE_SITE_KEY']?.trim();
if (!siteKey) {
  throw new Error(
    'TURNSTILE_SITE_KEY is required for a production contact-form build.',
  );
}

const configPath = resolve('src/environments/site-config.production.json');
const config = JSON.parse(await readFile(configPath, 'utf8')) as Record<
  string,
  unknown
>;
config['contactCaptchaSiteKey'] = siteKey;
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
