/** Resolve registered routes, optional public-example selection and section fragments. */
export function resolveGuideLinks(
  content: string,
  routes: Readonly<Record<string, string>>,
  filePath: string,
): string {
  const resolved = content.replace(
    /href="\{\{\s*GuideSlug\.([A-Za-z][A-Za-z0-9]*)\s*\}\}(\?example=[a-z0-9]+(?:-[a-z0-9]+)*)?(#[A-Za-z][A-Za-z0-9_-]*)?"/g,
    (
      _match,
      reference: string,
      query: string | undefined,
      fragment: string | undefined,
    ) => {
      const slug = routes[reference];
      if (!slug) {
        throw new Error(
          `Guide validation failed: ${filePath} references unknown internal route ${reference}.`,
        );
      }
      return `href="/${slug}${query ?? ''}${fragment ?? ''}"`;
    },
  );
  if (/\{\{\s*GuideSlug\./.test(resolved)) {
    throw new Error(
      `Guide validation failed: ${filePath} contains an unresolved route placeholder.`,
    );
  }
  return resolved;
}
