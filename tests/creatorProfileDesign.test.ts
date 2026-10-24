// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const styles = readFileSync(new URL('../src/pages/public/CreatorProfile.css', import.meta.url), 'utf8');

describe('creator profile responsive and light-mode design', () => {
  it('keeps the mobile profile within the viewport with a deliberate small-screen layout', () => {
    assert.match(styles, /@media\s*\(max-width:\s*640px\)/);
    assert.match(styles, /\.creator-profile-content[^}]*padding-inline/);
    assert.match(styles, /\.creator-profile-actions[^}]*grid-template-columns/);
    assert.match(styles, /\.creator-profile-media[^}]*min-height/);
  });

  it('provides readable light-mode surfaces without removing the dark cover overlay', () => {
    assert.match(styles, /\.light\s+\.creator-profile-page\s+\.creator-profile-surface/);
    assert.match(styles, /\.light\s+\.creator-profile-page\s+\.creator-profile-post-card/);
    assert.match(styles, /\.light\s+\.creator-profile-page\s+\.creator-profile-tabs/);
    assert.match(styles, /var\(--card\)/);
    assert.match(styles, /var\(--fg\)/);
    assert.match(styles, /\.creator-profile-hero-overlay/);
  });

  it('adapts the identity and profile actions for narrow phone widths', () => {
    assert.match(styles, /\.creator-profile-brand[^}]*text-overflow/);
    assert.match(styles, /\.creator-profile-details[^}]*flex:\s*1\s+1\s+0/);
    assert.match(styles, /\.creator-profile-subscribe-action\s*>\s*span:last-child/);
    assert.match(styles, /max-width:\s*360px/);
  });
});
