// Vercel serverless entry: every /api/* request is handled by the Express app.
require('../server/env');
process.env.TRUST_PROXY = process.env.TRUST_PROXY || '1'; // Vercel sits behind a proxy

let handler;
try {
  const { createApp } = require('../server/app');
  const { create } = require('../server/store');
  // Without Supabase, demo data can only live in /tmp (read-only elsewhere) and is NOT shared or permanent.
  handler = createApp(create({ file: '/tmp/alumify-db.json' }));
} catch (e) {
  console.error('Alumify startup error:', e);
  handler = (req, res) => {
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `Server setup problem: ${e.message}` }));
  };
}
module.exports = handler;