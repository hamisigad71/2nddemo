// @ts-expect-error Node.js test types are not configured in this project.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateSignupImages } from '../src/lib/creatorSignupImages';

describe('creator signup image requirements', () => {
  it('requires a profile photo for creators', () => {
    assert.equal(validateSignupImages('creator', null, {} as File), 'Please upload your profile photo to complete registration.');
  });

  it('requires a cover photo for creators', () => {
    assert.equal(validateSignupImages('creator', {} as File, null), 'Please upload a cover photo to complete creator registration.');
  });

  it('allows creator signup only when both photos are selected', () => {
    assert.equal(validateSignupImages('creator', {} as File, {} as File), null);
  });

  it('does not require a cover photo for subscribers', () => {
    assert.equal(validateSignupImages('subscriber', {} as File, null), null);
  });

  it('continues to require a profile photo for subscribers', () => {
    assert.equal(validateSignupImages('subscriber', null, null), 'Please upload your profile photo to complete registration.');
  });
});
