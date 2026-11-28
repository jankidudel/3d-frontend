import { describe, expect, it } from 'vitest';
import {
  RELATED_GUIDE_LIMIT,
  guideClusters,
  relatedGuideSlugs,
} from '../src/content/guides/guide-clusters.mts';

const allSlugs = new Set(guideClusters.flatMap((cluster) => cluster.slugs));

describe('related guides', () => {
  it('links every guide to its cluster pillar first, never itself', () => {
    for (const cluster of guideClusters) {
      for (const slug of cluster.slugs) {
        const related = relatedGuideSlugs(slug, allSlugs);
        expect(related).not.toContain(slug);
        expect(related.length).toBeLessThanOrEqual(RELATED_GUIDE_LIMIT);
        expect(new Set(related).size).toBe(related.length);
        for (const candidate of related) {
          expect([...cluster.slugs, cluster.pillar]).toContain(candidate);
        }
        if (slug !== cluster.pillar) {
          expect(related[0]).toBe(cluster.pillar);
        }
      }
    }
  });

  it('gives every guide at least one related link', () => {
    for (const slug of allSlugs) {
      expect(relatedGuideSlugs(slug, allSlugs).length).toBeGreaterThan(0);
    }
  });

  it('prefers the nearest guides in curated order and skips unpublished ones', () => {
    const cluster = guideClusters.find(
      (candidate) => candidate.slugs.length > 6,
    )!;
    const middle = cluster.slugs[Math.floor(cluster.slugs.length / 2)]!;
    const nearest = cluster.slugs.filter(
      (slug) => slug !== middle && slug !== cluster.pillar,
    );
    const unpublished = relatedGuideSlugs(middle, allSlugs)[1]!;
    const published = new Set(
      [...allSlugs].filter((slug) => slug !== unpublished),
    );
    expect(relatedGuideSlugs(middle, published)).not.toContain(unpublished);
    expect(nearest.length).toBeGreaterThan(0);
  });

  it('returns nothing for an unknown guide', () => {
    expect(relatedGuideSlugs('not-a-guide', allSlugs)).toEqual([]);
  });
});
