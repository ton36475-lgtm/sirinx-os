import { StateLockerDo } from './StateLockerDo';

interface DurableObjectStubLike {
  fetch(request: Request): Promise<Response>;
}

interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStubLike;
}

interface WorkerEnv {
  THE_STATE_LOCKER: DurableObjectNamespaceLike;
}

const SAFE_PROJECT_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const ALLOWED_ACTIONS = new Set(['acquire', 'release', 'status']);

export { StateLockerDo };

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/locks\/([^/]+)\/([^/]+)$/);
    if (!match) return new Response('Not found', { status: 404 });

    const projectId = decodeURIComponent(match[1]);
    const action = match[2];
    if (!SAFE_PROJECT_ID.test(projectId) || !ALLOWED_ACTIONS.has(action)) {
      return new Response('Invalid lock route', { status: 400 });
    }

    const contentLength = Number(request.headers.get('Content-Length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 4_096) {
      return new Response('Request body too large', { status: 413 });
    }

    const objectId = env.THE_STATE_LOCKER.idFromName(projectId);
    const stub = env.THE_STATE_LOCKER.get(objectId);
    const objectRequest = new Request(`https://state-locker/${action}`, request);
    return stub.fetch(objectRequest);
  },
};
