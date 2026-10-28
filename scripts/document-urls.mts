/** Browser URL semantics, shared by static, graph and live auditors. */
export function documentUrl(
  document: Document,
  href: string,
  pageUrl: string,
): URL {
  const base = document.querySelector('base[href]')?.getAttribute('href');
  return new URL(href, base ? new URL(base, pageUrl) : pageUrl);
}

export function fragmentCount(document: Document, fragment: string): number {
  let id: string;
  try {
    id = decodeURIComponent(fragment.replace(/^#/, ''));
  } catch {
    return 0;
  }
  return [...document.querySelectorAll('[id], a[name]')].filter(
    (element) => element.id === id || element.getAttribute('name') === id,
  ).length;
}
