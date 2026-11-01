/** Split only allowlisted, build-sanitized headings; Angular still sanitizes bodies. */
export function guideSections(html: string):
  | readonly {
      readonly id: string;
      readonly heading: string;
      readonly html: string;
    }[]
  | undefined {
  const pattern = /<h2 id="user-content-(guide-[a-z0-9-]+)">([^<]+)<\/h2>/g;
  const matches = [...html.matchAll(pattern)];
  if (matches.length === 0) {
    return undefined;
  }
  const ids = matches.map((match) => match[1]);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Guide section IDs must be unique.');
  }
  return [
    { id: '', heading: '', html: html.slice(0, matches[0].index) },
    ...matches.map((match, index) => ({
      id: match[1],
      heading: match[2],
      html: html.slice(
        match.index! + match[0].length,
        matches[index + 1]?.index,
      ),
    })),
  ];
}
