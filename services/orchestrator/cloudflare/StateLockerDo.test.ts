import { describe, expect, it } from 'bun:test';

import {
  StateLockerDo,
  type DurableObjectStateLike,
  type DurableObjectStorageLike,
} from '../../../legacy/StateLockerDo';


class FakeStorage implements DurableObjectStorageLike {
  readonly values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.values.get(key) as T | undefined;
  }

  async put(key: string, value: unknown): Promise<void> {
    this.values.set(key, value);
  }

  async delete(keys: string | string[]): Promise<boolean> {
    const keyList = Array.isArray(keys) ? keys : [keys];
    let changed = false;
    for (const key of keyList) changed = this.values.delete(key) || changed;
    return changed;
  }

  async transaction<T>(callback: (txn: DurableObjectStorageLike) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

function request(action: string, body?: object, token = 'test-token'): Request {
  return new Request(`https://state-locker/${action}`, {
    method: action === 'status' ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('StateLockerDo', () => {
  function createLock() {
    const storage = new FakeStorage();
    const state: DurableObjectStateLike = { storage };
    return { storage, lock: new StateLockerDo(state, { LOCK_AUTH_TOKEN: 'test-token' }) };
  }

  it('fails closed when authorization is absent', async () => {
    const { lock } = createLock();
    const response = await lock.fetch(
      new Request('https://state-locker/status', { method: 'GET' })
    );
    expect(response.status).toBe(401);
  });

  it('acquires, reports, and releases a bounded lock', async () => {
    const { lock } = createLock();
    const acquired = await lock.fetch(
      request('acquire', { client_id: 'mac-mini', ttl_ms: 10_000 })
    );
    expect(acquired.status).toBe(200);
    expect((await acquired.json()).status).toBe('LOCKED');

    const status = await lock.fetch(request('status'));
    expect(await status.json()).toMatchObject({
      status: 'LOCKED',
      is_locked: true,
      current_owner: 'mac-mini',
    });

    const released = await lock.fetch(request('release', { client_id: 'mac-mini' }));
    expect((await released.json()).status).toBe('RELEASED');
  });

  it('denies a competing owner', async () => {
    const { lock } = createLock();
    await lock.fetch(request('acquire', { client_id: 'mac-mini' }));
    const response = await lock.fetch(request('acquire', { client_id: 'pc-node' }));
    expect(response.status).toBe(423);
    expect((await response.json()).status).toBe('DENIED');
  });

  it('rejects unbounded TTL and unsafe client identifiers', async () => {
    const { lock } = createLock();
    const ttlResponse = await lock.fetch(
      request('acquire', { client_id: 'mac-mini', ttl_ms: 900_000 })
    );
    expect(ttlResponse.status).toBe(400);

    const idResponse = await lock.fetch(
      request('acquire', { client_id: "node'; rm -rf /" })
    );
    expect(idResponse.status).toBe(400);
  });
});
