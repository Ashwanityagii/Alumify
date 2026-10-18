const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const D = require('./domain');
const { HttpError, bad } = D;

function createApp(store) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

  // ---- security headers ----
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
        "font-src 'self' data:; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    });
    next();
  });
  app.use(express.json({ limit: '20kb' }));

  const api = express.Router();
  api.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // ---- login throttling (per IP + email) ----
  const attempts = new Map();
  const throttle = (key) => {
    const now = Date.now(); const a = attempts.get(key);
    if (a && a.reset > now && a.n >= 8) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
    return () => { const cur = attempts.get(key); if (!cur || cur.reset <= now) attempts.set(key, { n: 1, reset: now + 15 * 60e3 }); else cur.n++; };
  };
  setInterval(() => { const n = Date.now(); for (const [k, v] of attempts) if (v.reset <= n) attempts.delete(k); }, 5 * 60e3).unref();

  // ---- authentication ----
  const authenticate = wrap(async (req, res, next) => {
    const h = req.get('authorization') || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (token) {
      const id = await store.auth.verify(token);
      const u = id && await store.getUser(id);
      if (u && u.status === 'active') req.user = u; // disabled / pending accounts lose access immediately
    }
    next();
  });
  api.use(authenticate);

  const requireRole = (role) => (req, res, next) => {
    // /api/admin/* never reveals its existence to non-admins.
    if (role === 'admin' && (!req.user || req.user.role !== 'admin')) return res.status(404).json({ error: 'Not found' });
    if (!req.user) return res.status(401).json({ error: 'Please sign in' });
    if (req.user.role !== role) return res.status(403).json({ error: 'This area is not available for your role' });
    next();
  };

  async function doLogin(req, res, allowed) {
    const { email, password, role } = req.body || {};
    if (!D.isEmail(email) || typeof password !== 'string' || !password || password.length > 200) throw bad('Enter your email and password');
    const fail = throttle(`${req.ip}|${email.toLowerCase()}`);
    const session = await store.auth.login(email.trim().toLowerCase(), password);
    const user = session && await store.getUser(session.userId);
    // Same generic error for wrong password, unknown user, or wrong role tab (no account enumeration).
    if (!user || !allowed.includes(user.role) || (role && role !== user.role)) { fail(); throw new HttpError(401, 'Invalid email, password or role'); }
    if (user.status === 'pending') throw new HttpError(403, 'Your account is awaiting administrator approval.');
    if (user.status !== 'active') throw new HttpError(403, 'This account has been disabled.');
    res.json({ token: session.token, user: D.publicUser(user) });
  }
  api.post('/auth/login', wrap((req, res) => doLogin(req, res, ['student', 'alumni', 'faculty'])));
  api.post('/auth/admin-login', wrap((req, res) => doLogin(req, res, ['admin'])));
  // Admin signup is protected by a secret code (ADMIN_SIGNUP_CODE in .env). If the code is not configured, the endpoint does not exist.
  api.post('/auth/admin-register', wrap(async (req, res) => {
    const code = process.env.ADMIN_SIGNUP_CODE;
    if (!code) return res.status(404).json({ error: 'Admin signup is not enabled' });
    const b = req.body || {};
    const fail = throttle(`adminreg|${req.ip}`);
    const given = Buffer.from(String(b.adminCode || '')), want = Buffer.from(code);
    if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) { fail(); throw new HttpError(403, 'Invalid admin code'); }
    if (!D.isEmail(b.email) || typeof b.password !== 'string' || b.password.length < 10 || b.password.length > 72) throw bad('Enter a valid email and a password of 10-72 characters');
    const p = { email: b.email.trim().toLowerCase(), role: 'admin', name: D.clean(b.name, 2, 80, 'Name'), branch: '', year: null, gradYear: null, headline: 'Administrator', tags: [], status: 'active' };
    const r = await store.auth.register(p.email, b.password, p);
    if (r.error) throw new HttpError(409, r.error);
    res.status(201).json({ ok: true });
  }));
  api.post('/auth/register', wrap(async (req, res) => {
    const p = D.validateRegistration(req.body || {});
    const r = await store.auth.register(p.email, req.body.password, p);
    if (r.error) throw new HttpError(409, r.error);
    res.status(201).json({ ok: true, pending: p.status === 'pending' });
  }));
  api.get('/me', (req, res) => req.user ? res.json({ user: D.publicUser(req.user) }) : res.status(401).json({ error: 'Please sign in' }));

  // ---- student ----
  const student = express.Router();
  student.get('/overview', wrap(async (req, res) => {
    const [mine, users] = await Promise.all([store.listRequests({ studentId: req.user.id }), store.listUsers()]);
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    const requests = mine.map((r) => decorate(r, byId, 'student'));
    const open = mine.filter((r) => D.OPEN.includes(r.status)).length;
    const completed = mine.filter((r) => r.status === 'completed');
    const sessions = D.countCompleted(mine);
    const directory = users.filter((u) => u.status === 'active' && ['alumni', 'faculty'].includes(u.role)).map(D.publicUser);
    res.json({ counter: sessions, open, maxOpen: D.MAX_OPEN_REQUESTS, requests, directory, completedCount: completed.length });
  }));
  student.post('/requests', wrap(async (req, res) => {
    let target = null;
    if (req.body.targetId) {
      target = await store.getUser(String(req.body.targetId));
      if (!target || target.status !== 'active' || !['alumni', 'faculty'].includes(target.role)) throw bad('That mentor is not available');
    }
    const data = D.validateRequest(req.body, target);
    const mine = await store.listRequests({ studentId: req.user.id });
    if (mine.filter((r) => D.OPEN.includes(r.status)).length >= D.MAX_OPEN_REQUESTS)
      throw new HttpError(429, `You can have at most ${D.MAX_OPEN_REQUESTS} open requests. Cancel one or wait for a session to complete.`);
    const created = await store.createRequest({ ...data, studentId: req.user.id }); // studentId always from the session, never the body
    res.status(201).json({ request: created });
  }));
  student.post('/requests/:id/cancel', wrap(async (req, res) => {
    const r = await store.getRequest(req.params.id);
    if (!r || r.studentId !== req.user.id) throw new HttpError(404, 'Request not found');
    const u = await store.transition(r.id, ['pending'], { status: 'cancelled' });
    if (!u) throw new HttpError(409, 'Only pending requests can be cancelled');
    res.json({ request: u });
  }));
  api.use('/student', requireRole('student'), student);

  // ---- alumni & faculty (identical engine, role-locked routers) ----
  const mentorRouter = (role) => {
    const r = express.Router();
    const visible = (req, q) => q.audience === role && q.status === 'pending' &&
      (!q.targetId || q.targetId === req.user.id) && !q.rejectedBy.includes(req.user.id);

    r.get('/overview', wrap(async (req, res) => {
      const [pool, mine, users] = await Promise.all([
        store.listRequests({ audience: role, status: 'pending' }), store.listRequests({ mentorId: req.user.id }), store.listUsers()]);
      const byId = Object.fromEntries(users.map((u) => [u.id, u]));
      const incoming = pool.filter((q) => visible(req, q)).map((q) => decorate(q, byId, 'mentor'));
      const sessions = mine.map((q) => decorate(q, byId, 'mentor'));
      const counter = D.countCompleted(mine);
      res.json({ incoming, sessions, counter,
        stats: { pending: incoming.length, active: mine.filter((q) => ['accepted', 'scheduled'].includes(q.status)).length, completed: counter.total } });
    }));

    const act = (name, fromStatuses, build) => r.post(`/requests/:id/${name}`, wrap(async (req, res) => {
      const q = await store.getRequest(req.params.id);
      if (!q || q.audience !== role) throw new HttpError(404, 'Request not found');
      const patch = await build(req, q);
      const updated = await store.transition(q.id, fromStatuses, patch);
      if (!updated) throw new HttpError(409, 'This request was already handled');
      res.json({ request: updated });
    }));
    // Not addressed to me / already rejected by me -> 404 (existence hidden). Addressed to me but already taken -> 409.
    const assertVisible = (req, q) => {
      const eligible = q.audience === role && (!q.targetId || q.targetId === req.user.id) && !q.rejectedBy.includes(req.user.id);
      if (!eligible) throw new HttpError(404, 'Request not found');
      if (q.status !== 'pending') throw new HttpError(409, 'This request was already handled');
    };

    act('accept', ['pending'], (req, q) => { assertVisible(req, q);
      return { status: 'accepted', mentorId: req.user.id, acceptedAt: new Date().toISOString() }; });
    act('schedule', ['pending'], (req, q) => { assertVisible(req, q);
      const t = new Date(req.body.scheduledAt);
      if (isNaN(t) || t.getTime() < Date.now() + 60e3 || t.getTime() > Date.now() + 365 * 864e5) throw bad('Pick a future date within the next year');
      return { status: 'scheduled', mentorId: req.user.id, scheduledAt: t.toISOString(), acceptedAt: new Date().toISOString() }; });
    r.post('/requests/:id/reject', wrap(async (req, res) => {
      const q = await store.getRequest(req.params.id);
      if (!q || q.audience !== role) throw new HttpError(404, 'Request not found');
      assertVisible(req, q);
      if (q.targetId === req.user.id) { // addressed to this mentor only -> the student is told it was declined
        const u = await store.transition(q.id, ['pending'], { status: 'declined', mentorId: req.user.id });
        if (!u) throw new HttpError(409, 'This request was already handled');
      } else await store.addRejection(q.id, req.user.id); // pool request: just hide it from this mentor
      res.json({ ok: true });
    }));
    // Counter only moves here: the assigned mentor concludes the session.
    r.post('/requests/:id/complete', wrap(async (req, res) => {
      const q = await store.getRequest(req.params.id);
      if (!q || q.audience !== role || q.mentorId !== req.user.id) throw new HttpError(404, 'Request not found');
      const u = await store.transition(q.id, ['accepted', 'scheduled'], { status: 'completed', completedAt: new Date().toISOString() });
      if (!u) throw new HttpError(409, 'This session is not in progress');
      res.json({ request: u });
    }));
    return r;
  };
  api.use('/alumni', requireRole('alumni'), mentorRouter('alumni'));
  api.use('/faculty', requireRole('faculty'), mentorRouter('faculty'));

  // ---- admin ----
  const admin = express.Router();
  admin.get('/overview', wrap(async (req, res) => {
    const [users, requests] = await Promise.all([store.listUsers(), store.listRequests()]);
    const count = (arr, k, v) => arr.filter((x) => x[k] === v).length;
    res.json({
      mode: store.mode,
      users: { total: users.length, students: count(users, 'role', 'student'), alumni: count(users, 'role', 'alumni'),
        faculty: count(users, 'role', 'faculty'), pending: count(users, 'status', 'pending') },
      requests: { total: requests.length, pending: count(requests, 'status', 'pending'), active: requests.filter((r) => ['accepted', 'scheduled'].includes(r.status)).length,
        completed: count(requests, 'status', 'completed') },
      pendingUsers: users.filter((u) => u.status === 'pending').map(D.publicUser),
    });
  }));
  admin.get('/users', wrap(async (req, res) => res.json({ users: (await store.listUsers()).map(D.publicUser) })));
  admin.get('/requests', wrap(async (req, res) => {
    const [requests, users] = await Promise.all([store.listRequests(), store.listUsers()]);
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    res.json({ requests: requests.map((r) => ({ ...decorate(r, byId, 'admin'), studentEmail: byId[r.studentId]?.email })) });
  }));
  admin.post('/users', wrap(async (req, res) => {
    const b = req.body || {};
    if (b.role === 'admin') {
      if (!D.isEmail(b.email) || typeof b.password !== 'string' || b.password.length < 10) throw bad('Admin needs a valid email and a 10+ character password');
      const p = { email: b.email.trim().toLowerCase(), role: 'admin', name: D.clean(b.name, 2, 80, 'Name'), branch: '', year: null, gradYear: null, headline: 'Administrator', tags: [], status: 'active' };
      const r = await store.auth.register(p.email, b.password, p);
      if (r.error) throw new HttpError(409, r.error);
      return res.status(201).json({ ok: true });
    }
    const p = D.validateRegistration(b); p.status = 'active';
    const r = await store.auth.register(p.email, b.password, p);
    if (r.error) throw new HttpError(409, r.error);
    res.status(201).json({ ok: true });
  }));
  const setStatus = (name, status) => admin.post(`/users/:id/${name}`, wrap(async (req, res) => {
    if (req.params.id === req.user.id) throw bad('You cannot change your own account status');
    const u = await store.updateUser(req.params.id, { status });
    if (!u) throw new HttpError(404, 'User not found');
    res.json({ user: D.publicUser(u) });
  }));
  setStatus('approve', 'active'); setStatus('disable', 'disabled'); setStatus('enable', 'active');
  api.use('/admin', requireRole('admin'), admin);

  api.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use('/api', api);

  // ---- production: serve the built React app ----
  const dist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (req, res) => res.set('Cache-Control', 'no-store').sendFile(path.join(dist, 'index.html')));
  }

  app.use((err, req, res, next) => { // eslint-disable-line
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') return res.status(400).json({ error: 'Invalid request body' });
    const status = err.status && err.status < 600 ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 500 ? 'Something went wrong' : err.message });
  });
  return app;
}

// Shape a request for the client; each role only receives the contact info it is entitled to.
function decorate(r, byId, viewer) {
  const student = byId[r.studentId], mentor = r.mentorId && byId[r.mentorId], target = r.targetId && byId[r.targetId];
  const out = {
    id: r.id, type: r.type, typeLabel: D.TYPES[r.type].label, minutes: D.TYPES[r.type].minutes, audience: r.audience, topic: r.topic, details: r.details,
    batchStatus: r.batchStatus, status: r.status, scheduledAt: r.scheduledAt, createdAt: r.createdAt, acceptedAt: r.acceptedAt, completedAt: r.completedAt,
    name: r.name, branch: r.branch, year: r.year, targetName: target ? target.name : null,
    mentorName: mentor ? mentor.name : null, mentorHeadline: mentor ? mentor.headline : null,
  };
  const connected = ['accepted', 'scheduled', 'completed'].includes(r.status);
  if (viewer === 'student' && connected && mentor) out.mentorEmail = mentor.email;   // revealed only after acceptance
  if (viewer === 'mentor' && connected && student) out.studentEmail = student.email;
  return out;
}

module.exports = { createApp };
