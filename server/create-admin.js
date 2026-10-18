require('./env');
// Usage (Supabase mode): ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='long-password' node server/create-admin.js
const { create } = require('./store');
const store = create();
const email = (process.env.ADMIN_EMAIL || '').toLowerCase(), password = process.env.ADMIN_PASSWORD || '';
if (!email || password.length < 10) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars)'); process.exit(1); }
store.auth.register(email, password, { email, role: 'admin', name: process.env.ADMIN_NAME || 'Administrator', status: 'active',
  branch: '', year: null, gradYear: null, headline: 'Administrator', tags: [] })
  .then((r) => { console.log(r.error ? `Failed: ${r.error}` : `Admin created: ${email}`); process.exit(r.error ? 1 : 0); })
  .catch((e) => { console.error(e.message); process.exit(1); });
