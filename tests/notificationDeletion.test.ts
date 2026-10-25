// @ts-expect-error Node.js test types are not configured in this project.
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { supabase } from '../src/lib/supabase';
import { deleteNotification } from '../src/lib/db';

const originalFrom = supabase.from;
const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  Object.defineProperty(supabase, 'from', { configurable: true, value: originalFrom });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
});

describe('notification deletion ownership', () => {
  it('deletes only the notification belonging to the signed-in user', async () => {
    const filters: Array<[string, string]> = [];
    const query = {
      delete: () => query,
      eq: (column: string, value: string) => {
        filters.push([column, value]);
        return query;
      },
      then: (resolve: (result: { error: null }) => unknown) =>
        Promise.resolve({ error: null }).then(resolve),
    };
    const cache = new Map([
      [
        'tgd_notifications_user-1',
        JSON.stringify([{ id: 'notice-1' }, { id: 'notice-2' }]),
      ],
      ['tgd_notifications_user-2', JSON.stringify([{ id: 'notice-1' }])],
    ]);

    Object.defineProperty(supabase, 'from', {
      configurable: true,
      value: () => query,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => cache.get(key) ?? null,
        setItem: (key: string, value: string) => cache.set(key, value),
      },
    });

    await deleteNotification('notice-1', 'user-1');

    assert.deepEqual(filters, [
      ['id', 'notice-1'],
      ['user_id', 'user-1'],
    ]);
    assert.deepEqual(
      JSON.parse(cache.get('tgd_notifications_user-1') || '[]'),
      [{ id: 'notice-2' }],
    );
    assert.deepEqual(
      JSON.parse(cache.get('tgd_notifications_user-2') || '[]'),
      [{ id: 'notice-1' }],
    );
  });

  it('refuses to delete without an authenticated user id', async () => {
    await assert.rejects(deleteNotification('notice-1'), /user id is required/i);
  });
});
