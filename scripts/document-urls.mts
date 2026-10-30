/** Browser URL semantics, shared by static, graph and live auditors. */
export function documentUrl(
  document: Document,
  href: string,
  pageUrl: string,
): URL {
  const base = document.querySelector('base[href]')?.getAttribute('href');
  return new URL(href, base ? new URL(base, pageUrl) : pageUrl);
}

/** Count each element once, including legacy named anchors and duplicate IDs. */
export function documentFragments(
  document: Document,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const element of document.querySelectorAll('[id], a[name]')) {
    for (const id of new Set([element.id, element.getAttribute('name')])) {
      if (id !== null) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export function indexedFragmentCount(
  counts: ReadonlyMap<string, number>,
  fragment: string,
): number {
  try {
    return counts.get(decodeURIComponent(fragment.replace(/^#/, ''))) ?? 0;
  } catch {
    return 0;
  }
}

export function fragmentCount(document: Document, fragment: string): number {
  return indexedFragmentCount(documentFragments(document), fragment);
}
