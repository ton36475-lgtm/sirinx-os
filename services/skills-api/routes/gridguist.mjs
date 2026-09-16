import { runGridGuist, runFullAudit } from '../../skills/grid-guist/run.js';

export async function handleGridGuistRequest(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const mode = url.searchParams.get('mode') || 'redesign';
  const target = url.searchParams.get('target') || 'dashboard';
  const full = url.searchParams.get('full') === 'true';

  const result = full
    ? await runFullAudit({ target })
    : await runGridGuist({ mode, target });

  return {
    ...result,
    endpoints: {
      redesign: '/api/gridguist?mode=redesign&target=component',
      review: '/api/gridguist?mode=review&target=src/file.js',
      audit: '/api/gridguist?mode=audit&target=component',
      full: '/api/gridguist?full=true&target=component',
    },
    designPrinciples: ['Swiss Design', 'Editorial Grid', 'Technical Minimalism'],
  };
}

export const gridguistRoutes = [
  { path: '/api/gridguist', handler: handleGridGuistRequest },
];
