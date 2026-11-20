import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import app, { config } from '../netlify/server/index.js';

test('Netlify entrypoint serves the API without starting Vite or requiring AI credentials', async (t) => {
  assert.equal(config.path, '/api/*');
  const server = app.listen(0, '127.0.0.1');
  t.after(() => server.close());
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;

  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  for (const route of ['/api/convert', '/api/convert/stream']) {
    const response = await fetch(`${base}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: '', extraInstructions: 'a'.repeat(15104) }),
    });
    assert.equal(response.status, 400);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
    assert.match((await response.json()).error, /pelo menos 20 caracteres/);
  }
});
