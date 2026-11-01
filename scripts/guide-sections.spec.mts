import { describe, expect, it } from 'vitest';
import { guideSections } from './guide-sections.mts';

describe('guide section anchors', () => {
  it('preserves lead, heading entities and following HTML with bounded IDs', () => {
    const html =
      '<p>Lead</p><h2 id="user-content-guide-result">A &amp; B</h2><p>Evidence</p><h2 id="user-content-guide-steps">Steps</h2><ol><li>Act</li></ol>';
    expect(guideSections(html)).toEqual([
      { id: '', heading: '', html: '<p>Lead</p>' },
      { id: 'guide-result', heading: 'A &amp; B', html: '<p>Evidence</p>' },
      { id: 'guide-steps', heading: 'Steps', html: '<ol><li>Act</li></ol>' },
    ]);
  });
  it('does not accept arbitrary IDs or ambiguous duplicate targets', () => {
    expect(
      guideSections('<h2 id="location">Unsafe target</h2>'),
    ).toBeUndefined();
    expect(() =>
      guideSections(
        '<h2 id="user-content-guide-a">One</h2><h2 id="user-content-guide-a">Two</h2>',
      ),
    ).toThrow();
  });
});
