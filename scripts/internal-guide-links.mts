/** Resolve registered route placeholders, retaining a validated section fragment. */
export function resolveGuideLinks(
  content: string,
  routes: Readonly<Record<string, string>>,
  filePath: string,
): string {
  return content.replace(
    /href="\{\{\s*GuideSlug\.([A-Za-z][A-Za-z0-9]*)\s*\}\}(#[A-Za-z][A-Za-z0-9_-]*)?"/g,
    (_match, reference: string, fragment: string | undefined) => {
      const slug = routes[reference];
      if (!slug) {
        throw new Error(
          `Guide validation failed: ${filePath} references unknown internal route ${reference}.`,
        );
      }
      return `href="/${slug}${fragment ?? ''}"`;
    },
  );
}
