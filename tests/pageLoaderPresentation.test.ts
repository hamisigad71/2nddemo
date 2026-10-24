// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPageLoaderPresentation } from '../src/lib/pageLoaderPresentation';

describe('page loader presentation', () => {
  it('gives light mode a clean mobile canvas, legible type, and quiet progress track', () => {
    const presentation = getPageLoaderPresentation('light');

    assert.match(presentation.mobileBackdrop, /#F7F5F7/i);
    assert.match(presentation.surface, /bg-white/);
    assert.match(presentation.title, /#27232B/i);
    assert.match(presentation.subtitle, /#756B76/i);
    assert.match(presentation.progressTrack, /#E8E1E6/i);
    assert.equal(presentation.showMobilePhoto, false);
  });

  it('preserves the existing photo-based mobile treatment in dark mode', () => {
    const presentation = getPageLoaderPresentation('dark');

    assert.equal(presentation.mobileBackdrop, '');
    assert.equal(presentation.surface, '');
    assert.equal(presentation.showMobilePhoto, true);
  });
});
