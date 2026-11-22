/** Site-wide identity shared by social previews and structured data. */
export const SITE_NAME = 'InspectMesh';

/** Default social preview image, served from `public/`. */
export const SHARE_IMAGE = {
  path: '/images/social/inspectmesh-share.png',
  width: 1200,
  height: 630,
  type: 'image/png',
  alt: 'InspectMesh: check STL, 3MF and G-code files before you print',
} as const;

const LOGO_PATH = '/logo.webp';

/** Twitter/X preview layout that shows the large share image. */
export const TWITTER_CARD = 'summary_large_image';

export function organizationId(origin: string): string {
  return `${origin}/#organization`;
}

export function websiteId(origin: string): string {
  return `${origin}/#website`;
}

/** Organization and WebSite nodes, declared once on the home page. */
export function siteIdentityNodes(
  origin: string,
): readonly Record<string, unknown>[] {
  return [
    {
      '@type': 'Organization',
      '@id': organizationId(origin),
      name: SITE_NAME,
      url: `${origin}/`,
      logo: `${origin}${LOGO_PATH}`,
    },
    {
      '@type': 'WebSite',
      '@id': websiteId(origin),
      name: SITE_NAME,
      url: `${origin}/`,
      publisher: { '@id': organizationId(origin) },
    },
  ];
}

/** Publisher reference that stays meaningful on pages without the home graph. */
export function publisherNode(origin: string): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': organizationId(origin),
    name: SITE_NAME,
    url: `${origin}/`,
  };
}
