import { JSDOM } from 'jsdom';

const { DOMParser } = new JSDOM('').window;
const parser = new DOMParser();

/** Inspect inert HTML and return scalar observations, never DOM nodes. */
export function withHtmlDocument<T>(
  html: string,
  inspect: (document: Document) => T,
): T {
  const document = parser.parseFromString(html, 'text/html');
  try {
    return inspect(document);
  } finally {
    // jsdom tracks named elements against the parser realm, even in detached
    // documents. Detach the entire tree to release IDs, names and selector caches.
    document.replaceChildren();
  }
}
