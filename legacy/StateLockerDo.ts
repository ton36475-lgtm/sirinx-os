/** Phase 5C Durable Object lock contract. */

export interface DurableObjectStorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(keys: string | string[]): Promise<boolean>;
  transaction<T>(callback: (txn: DurableObjectStorageLike) => Promise<T>): Promise<T>;
}

export interface DurableObjectStateLike {
  storage: DurableObjectStorageLike;
}

export interface StateLockerEnv {
  LOCK_AUTH_TOKEN?: string;
}

export interface LockRequest {
  client_id: string;
  ttl_ms?: number;
}

export interface LockResponse {
  status: 'LOCKED' | 'DENIED' | 'RELEASED' | 'AVAILABLE' | 'ERROR';
  owner?: string;
  expires_in_ms?: number;
  message?: string;
  is_locked?: boolean;
  current_owner?: string | null;
  time_left_ms?: number;
}

const MIN_TTL_MS = 1_000;
const MAX_TTL_MS = 300_000;
const DEFAULT_TTL_MS = 45_000;
const SAFE_CLIENT_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;

function secureEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function jsonResponse(payload: LockResponse, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function parseBearer(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

async function parseLockRequest(request: Request): Promise<LockRequest> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    throw new Error('Content-Type must be application/json');
  }
  const value = (await request.json()) as Partial<LockRequest> | null;
  if (!value || typeof value.client_id !== 'string' || !SAFE_CLIENT_ID.test(value.client_id)) {
    throw new Error('client_id is invalid');
  }
  if (
    value.ttl_ms !== undefined &&
    (!Number.isInteger(value.ttl_ms) ||
      value.ttl_ms < MIN_TTL_MS ||
      value.ttl_ms > MAX_TTL_MS)
  ) {
    throw new Error('ttl_ms is outside the supported range');
  }
  return { client_id: value.client_id, ttl_ms: value.ttl_ms };
}

interface LockState {
  owner: string | null;
  expiresAt: number;
}

async function readLockState(storage: DurableObjectStorageLike): Promise<LockState> {
  const owner = (await storage.get<string>('lock_owner')) ?? null;
  const expiresAt = (await storage.get<number>('expires_at')) ?? 0;
  if (owner && Date.now() >= expiresAt) {
    await storage.delete(['lock_owner', 'expires_at']);
    return { owner: null, expiresAt: 0 };
  }
  return { owner, expiresAt };
}

export class StateLockerDo {
  constructor(
    private readonly state: DurableObjectStateLike,
    private readonly env: StateLockerEnv
  ) {}

  async fetch(request: Request): Promise<Response> {
    const expectedToken = this.env.LOCK_AUTH_TOKEN;
    const suppliedToken = parseBearer(request);
    if (!expectedToken || !suppliedToken || !secureEqual(suppliedToken, expectedToken)) {
      return jsonResponse({ status: 'ERROR', message: 'Unauthorized lock request.' }, 401);
    }

    const action = new URL(request.url).pathname.replace(/^\/+|\/+$/g, '');
    if (action === 'status') {
      if (request.method !== 'GET') {
        return jsonResponse({ status: 'ERROR', message: 'Method not allowed.' }, 405);
      }
      return this.state.storage.transaction(async (txn) => {
        const current = await readLockState(txn);
        const timeLeft = current.owner
          ? Math.max(0, current.expiresAt - Date.now())
          : 0;
        return jsonResponse({
          status: current.owner ? 'LOCKED' : 'AVAILABLE',
          is_locked: Boolean(current.owner),
          current_owner: current.owner,
          time_left_ms: timeLeft,
        });
      });
    }

    if ((action !== 'acquire' && action !== 'release') || request.method !== 'POST') {
      return jsonResponse({ status: 'ERROR', message: 'Invalid lock protocol command.' }, 404);
    }

    let payload: LockRequest;
    try {
      payload = await parseLockRequest(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request body';
      return jsonResponse({ status: 'ERROR', message }, 400);
    }

    if (action === 'acquire') {
      return this.acquire(payload);
    }
    return this.release(payload);
  }

  private async acquire(payload: LockRequest): Promise<Response> {
    return this.state.storage.transaction(async (txn) => {
      const current = await readLockState(txn);
      if (current.owner && current.owner !== payload.client_id) {
        return jsonResponse(
          {
            status: 'DENIED',
            message: 'Resource is locked by another operational node.',
          },
          423
        );
      }

      const ttl = payload.ttl_ms ?? DEFAULT_TTL_MS;
      const expiresAt = Date.now() + ttl;
      await txn.put('lock_owner', payload.client_id);
      await txn.put('expires_at', expiresAt);
      return jsonResponse({
        status: 'LOCKED',
        owner: payload.client_id,
        expires_in_ms: ttl,
      });
    });
  }

  private async release(payload: LockRequest): Promise<Response> {
    return this.state.storage.transaction(async (txn) => {
      const current = await readLockState(txn);
      if (!current.owner) {
        return jsonResponse({ status: 'AVAILABLE', message: 'Resource was not locked.' });
      }
      if (current.owner !== payload.client_id) {
        return jsonResponse(
          { status: 'ERROR', message: 'Lock ownership verification failed.' },
          403
        );
      }
      await txn.delete(['lock_owner', 'expires_at']);
      return jsonResponse({ status: 'RELEASED', message: 'Lock released.' });
    });
  }
}
