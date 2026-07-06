const EDIT_PIN = '239010';
const SCORES_KEY = 'current';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/scores' && request.method === 'GET') {
      const stored = await env.SCORES.get(SCORES_KEY);
      return new Response(stored || '{"version":1,"players":[]}', {
        headers: { 'content-type': 'application/json' }
      });
    }

    if (url.pathname === '/api/scores' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body || body.pin !== EDIT_PIN) {
        return new Response(JSON.stringify({ error: 'Invalid PIN' }), {
          status: 403,
          headers: { 'content-type': 'application/json' }
        });
      }
      const { pin, ...data } = body;
      await env.SCORES.put(SCORES_KEY, JSON.stringify(data));
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
