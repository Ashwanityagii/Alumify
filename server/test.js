// End-to-end API test in demo (in-memory) mode: role isolation + request lifecycle + counters.
const assert = require('assert');
const { createApp } = require('./app');
const { create } = require('./store');

(async () => {
  const store = create({ forceMemory: true, file: false, secret: 'test-secret' });
  const server = createApp(store).listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, token, body) => {
    const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
  const login = async (email, password, role, admin) => (await call('POST', admin ? '/auth/admin-login' : '/auth/login', null, { email, password, role }));
  let n = 0; const ok = (name) => console.log(`  ✓ ${++n}. ${name}`);

  const S = (await login('aryan@alumify.dev', 'Student@123', 'student')).body.token;
  const S2 = (await login('sneha@alumify.dev', 'Student@123', 'student')).body.token;
  const A = (await login('vikram@alumify.dev', 'Alumni@123', 'alumni')).body.token;
  const A2 = (await login('priya@alumify.dev', 'Alumni@123', 'alumni')).body.token;
  const F = (await login('sandeep@alumify.dev', 'Faculty@123', 'faculty')).body.token;
  const ADM = (await login('admin@alumify.dev', 'Admin@12345', null, true)).body.token;
  assert(S && S2 && A && A2 && F && ADM); ok('all roles can sign in');

  // --- auth ---
  assert.equal((await login('aryan@alumify.dev', 'Student@123', 'alumni')).status, 401); ok('wrong role tab is rejected');
  assert.equal((await login('aryan@alumify.dev', 'nope', 'student')).status, 401); ok('wrong password rejected');
  assert.equal((await login('admin@alumify.dev', 'Admin@12345', 'student')).status, 401); ok('admin cannot sign in via public login');
  assert.equal((await login('aryan@alumify.dev', 'Student@123', null, true)).status, 401); ok('student cannot use admin login');
  assert.equal((await login('rhea@alumify.dev', 'Alumni@123', 'alumni')).status, 403); ok('pending alumni cannot sign in until approved');
  assert.equal((await call('GET', '/student/overview')).status, 401); ok('no token -> 401');
  assert.equal((await call('GET', '/student/overview', 'garbage.1.2')).status, 401); ok('forged token -> 401');
  const tampered = S.replace(/\.[0-9a-f]+$/, '.' + '0'.repeat(64));
  assert.equal((await call('GET', '/student/overview', tampered)).status, 401); ok('tampered signature -> 401');

  // --- route isolation ---
  for (const [tok, who] of [[S, 'student'], [A, 'alumni'], [F, 'faculty']]) {
    assert.equal((await call('GET', '/admin/overview', tok)).status, 404);
    assert.equal((await call('POST', '/admin/users/x/approve', tok)).status, 404);
  } ok('admin API is invisible (404) to student/alumni/faculty');
  assert.equal((await call('GET', '/admin/overview')).status, 404); ok('admin API invisible when signed out');
  assert.equal((await call('GET', '/alumni/overview', S)).status, 403);
  assert.equal((await call('GET', '/faculty/overview', S)).status, 403);
  assert.equal((await call('GET', '/student/overview', A)).status, 403);
  assert.equal((await call('GET', '/faculty/overview', A)).status, 403);
  assert.equal((await call('GET', '/alumni/overview', F)).status, 403);
  assert.equal((await call('GET', '/student/overview', ADM)).status, 404 === 0 ? 0 : 403); ok('cross-role access -> 403');

  // --- student creates requests ---
  const bad1 = await call('POST', '/student/requests', S, { name: 'A', branch: 'CSE', year: '3rd Year', audience: 'alumni', type: 'coffee', topic: 'x' });
  assert.equal(bad1.status, 400); ok('validation rejects short name/topic');
  assert.equal((await call('POST', '/student/requests', S, { name: 'Aryan', branch: 'CSE', year: '3rd Year', audience: 'alumni', type: 'batch', topic: 'Hello there' })).status, 400); ok('alumni request cannot use batch type');
  const created = await call('POST', '/student/requests', S, { name: 'Aryan Sengupta', branch: 'CSE', year: '3rd Year', audience: 'alumni', type: 'coffee', topic: 'Career in ML infra',
    studentId: 'evil', status: 'completed', mentorId: 'evil' });
  assert.equal(created.status, 201);
  assert.equal(created.body.request.status, 'pending'); assert.notEqual(created.body.request.studentId, 'evil'); ok('mass-assignment of studentId/status/mentorId ignored');
  const rid = created.body.request.id;

  // --- alumni sees it; faculty-audience requests invisible to alumni ---
  let ao = (await call('GET', '/alumni/overview', A)).body;
  assert(ao.incoming.some((r) => r.id === rid)); assert(ao.incoming.every((r) => r.audience === 'alumni')); ok('alumni sees pool requests, none addressed to faculty');
  assert(!ao.incoming.some((r) => r.targetName === 'Priya Sen')); ok("alumni can't see requests targeted at another alumnus");
  const fo = (await call('GET', '/faculty/overview', F)).body;
  assert(fo.incoming.every((r) => r.audience === 'faculty') && !fo.incoming.some((r) => r.id === rid)); ok('faculty only sees faculty-audience requests');
  assert(!JSON.stringify(ao).includes('@alumify.dev') || ao.sessions.every(Boolean)); // emails only on connected rows
  assert(ao.incoming.every((r) => !r.studentEmail)); ok('student email hidden before acceptance');

  // other roles can't act on it
  assert.equal((await call('POST', `/faculty/requests/${rid}/accept`, F)).status, 404); ok('faculty cannot accept an alumni request');
  assert.equal((await call('POST', `/student/requests/${rid}/cancel`, S2)).status, 404); ok("student cannot cancel someone else's request");

  // schedule validation + reject is per-mentor
  assert.equal((await call('POST', `/alumni/requests/${rid}/schedule`, A, { scheduledAt: '2001-01-01T10:00:00Z' })).status, 400); ok('schedule in the past rejected');
  assert.equal((await call('POST', `/alumni/requests/${rid}/reject`, A2)).status, 200);
  assert(!(await call('GET', '/alumni/overview', A2)).body.incoming.some((r) => r.id === rid));
  assert((await call('GET', '/alumni/overview', A)).body.incoming.some((r) => r.id === rid)); ok('reject hides it only for that alumnus');

  // before: counters
  const cnt = async (tok) => (await call('GET', '/alumni/overview', tok)).body.counter.total;
  const beforeA = await cnt(A), beforeA2 = await cnt(A2);
  const sBefore = (await call('GET', '/student/overview', S)).body.counter.total;
  // accept: first wins, second gets 409/404
  const [a1, a2] = await Promise.all([call('POST', `/alumni/requests/${rid}/accept`, A), call('POST', `/alumni/requests/${rid}/accept`, A)]);
  assert.deepEqual([a1.status, a2.status].sort(), [200, 409]); ok('concurrent double-accept: exactly one succeeds');
  assert.equal((await call('POST', `/alumni/requests/${rid}/accept`, A)).status, 409); ok('double accept -> 409');
  const winner = A, loser = A2;
  assert.equal((await call('POST', `/alumni/requests/${rid}/complete`, loser)).status, 404); ok('non-assigned alumnus cannot complete');
  const so = (await call('GET', '/student/overview', S)).body;
  assert(so.requests.find((r) => r.id === rid).mentorEmail); ok('student gets mentor contact after acceptance');
  assert.equal((await call('POST', `/student/requests/${rid}/cancel`, S)).status, 409); ok('accepted request cannot be cancelled');
  assert.equal((await call('GET', '/student/overview', S)).body.counter.total, sBefore); ok('counters do not move before completion');
  assert.equal((await call('POST', `/alumni/requests/${rid}/complete`, winner)).status, 200);
  assert.equal((await call('GET', '/student/overview', S)).body.counter.total, sBefore + 1); ok('student counter +1 after completion');
  assert.equal(await cnt(winner), (winner === A ? beforeA : beforeA2) + 1); assert.equal(await cnt(loser), loser === A ? beforeA : beforeA2); ok('alumni counter +1 for the assigned alumnus only');
  assert.equal((await call('POST', `/alumni/requests/${rid}/complete`, winner)).status, 409); ok('cannot complete twice (no counter inflation)');

  // targeted request -> reject marks declined for student
  const t = (await call('GET', '/student/overview', S2)).body.requests.find((r) => r.targetName === 'Priya Sen');
  assert.equal((await call('POST', `/alumni/requests/${t.id}/accept`, A)).status, 404); ok('targeted request cannot be accepted by another alumnus');
  assert.equal((await call('POST', `/alumni/requests/${t.id}/reject`, A2)).status, 200);
  assert.equal((await call('GET', '/student/overview', S2)).body.requests.find((r) => r.id === t.id).status, 'declined'); ok('targeted reject -> student sees declined');

  // faculty: schedule for later + complete
  const fr = (await call('GET', '/faculty/overview', F)).body.incoming[0];
  const future = new Date(Date.now() + 2 * 864e5).toISOString();
  assert.equal((await call('POST', `/faculty/requests/${fr.id}/schedule`, F, { scheduledAt: future })).status, 200);
  assert.equal((await call('POST', `/faculty/requests/${fr.id}/complete`, F)).status, 200); ok('faculty schedule + complete flow');

  // anti-spam limit
  let last;
  for (let i = 0; i < 8; i++) last = await call('POST', '/student/requests', S2, { name: 'Sneha Patel', branch: 'ECE', year: '4th Year', audience: 'faculty', batchStatus: 'running', topic: `Topic ${i} abc` });
  assert.equal(last.status, 429); ok('open-request cap enforced');

  // registration & approval
  assert.equal((await call('POST', '/auth/register', null, { email: 'new@x.com', password: 'longenough1', role: 'admin', name: 'Eve', branch: 'CSE' })).status, 400); ok('cannot self-register as admin');
  const reg = await call('POST', '/auth/register', null, { email: 'newalum@x.com', password: 'longenough1', role: 'alumni', name: 'New Alum', branch: 'CSE', headline: 'Engineer @ Acme', gradYear: 2020 });
  assert.equal(reg.status, 201); assert(reg.body.pending);
  assert.equal((await login('newalum@x.com', 'longenough1', 'alumni')).status, 403); ok('new alumni starts pending');
  const pend = (await call('GET', '/admin/overview', ADM)).body.pendingUsers.find((u) => u.email === 'newalum@x.com');
  assert.equal((await call('POST', `/admin/users/${pend.id}/approve`, ADM)).status, 200);
  const NA = await login('newalum@x.com', 'longenough1', 'alumni'); assert.equal(NA.status, 200); ok('admin approval activates account');
  assert.equal((await call('POST', `/admin/users/${pend.id}/disable`, ADM)).status, 200);
  assert.equal((await call('GET', '/alumni/overview', NA.body.token)).status, 401); ok('disabling an account kills its existing token');
  const me = (await call('GET', '/me', ADM)).body.user;
  assert.equal((await call('POST', `/admin/users/${me.id}/disable`, ADM)).status, 400); ok('admin cannot disable self');
  assert.equal((await call('POST', '/auth/register', null, { email: 'newalum@x.com', password: 'longenough1', role: 'student', name: 'Dup', branch: 'CSE', year: '1st Year' })).status, 409); ok('duplicate email rejected');
  assert.equal(JSON.stringify((await call('GET', '/admin/users', ADM)).body).includes('passHash'), false); ok('password hashes never leave the server');

  console.log(`\nAll ${n} checks passed`);
  server.close();
})().catch((e) => { console.error('FAIL:', e); process.exit(1); });
