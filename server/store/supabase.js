// Supabase adapter: Postgres (tables in supabase/schema.sql) + Supabase Auth.
// All access happens server-side with the service-role key; the browser never talks to Supabase directly.
const { createClient } = require('@supabase/supabase-js');

module.exports = function createSupabaseStore({ url, anonKey, serviceKey }) {
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const sb = createClient(url, serviceKey, opts);
  const fail = (error) => { if (error) { const e = new Error(error.message); e.status = 500; throw e; } };

  const toUser = (r) => r && ({ id: r.id, email: r.email, name: r.name, role: r.role, status: r.status, branch: r.branch,
    year: r.year, gradYear: r.grad_year, headline: r.headline || '', tags: r.tags || [], createdAt: r.created_at });
  const fromUserPatch = (p) => {
    const m = { gradYear: 'grad_year' }, out = {};
    for (const [k, v] of Object.entries(p)) out[m[k] || k] = v;
    return out;
  };
  const toReq = (r) => r && ({ id: r.id, studentId: r.student_id, name: r.name, branch: r.branch, year: r.year, type: r.type,
    topic: r.topic, details: r.details || '', audience: r.audience, targetId: r.target_id, batchStatus: r.batch_status,
    status: r.status, mentorId: r.mentor_id, rejectedBy: r.rejected_by || [], scheduledAt: r.scheduled_at,
    acceptedAt: r.accepted_at, completedAt: r.completed_at, createdAt: r.created_at });
  const reqCols = { studentId: 'student_id', mentorId: 'mentor_id', targetId: 'target_id', batchStatus: 'batch_status',
    scheduledAt: 'scheduled_at', acceptedAt: 'accepted_at', completedAt: 'completed_at', rejectedBy: 'rejected_by' };
  const fromReq = (p) => { const o = {}; for (const [k, v] of Object.entries(p)) o[reqCols[k] || k] = v; return o; };

  return {
    mode: 'supabase',
    auth: {
      async login(email, password) {
        const { data, error } = await createClient(url, anonKey, opts).auth.signInWithPassword({ email, password });
        if (error || !data.session) return null;
        return { token: data.session.access_token, userId: data.user.id };
      },
      async register(email, password, profile) {
        const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) return { error: /already|registered/i.test(error.message) ? 'An account with this email already exists' : error.message };
        const { error: pErr } = await sb.from('profiles').insert({
          id: data.user.id, email, name: profile.name, role: profile.role, status: profile.status,
          branch: profile.branch, year: profile.year, grad_year: profile.gradYear, headline: profile.headline, tags: profile.tags });
        if (pErr) { await sb.auth.admin.deleteUser(data.user.id); fail(pErr); }
        return { userId: data.user.id };
      },
      async verify(token) {
        const { data, error } = await sb.auth.getUser(token);
        return error || !data.user ? null : data.user.id;
      },
    },
    async getUser(id) {
      const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle(); fail(error); return toUser(data);
    },
    async getUserByEmail(email) {
      const { data, error } = await sb.from('profiles').select('*').eq('email', email).maybeSingle(); fail(error); return toUser(data);
    },
    async listUsers() {
      const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false }); fail(error); return data.map(toUser);
    },
    async updateUser(id, patch) {
      const { data, error } = await sb.from('profiles').update(fromUserPatch(patch)).eq('id', id).select().maybeSingle(); fail(error); return toUser(data);
    },
    async listRequests(f = {}) {
      let q = sb.from('requests').select('*').order('created_at', { ascending: false });
      if (f.studentId) q = q.eq('student_id', f.studentId);
      if (f.mentorId) q = q.eq('mentor_id', f.mentorId);
      if (f.audience) q = q.eq('audience', f.audience);
      if (f.status) q = q.eq('status', f.status);
      const { data, error } = await q; fail(error); return data.map(toReq);
    },
    async getRequest(id) {
      const { data, error } = await sb.from('requests').select('*').eq('id', id).maybeSingle(); fail(error); return toReq(data);
    },
    async createRequest(r) {
      const { data, error } = await sb.from('requests').insert(fromReq(r)).select().single(); fail(error); return toReq(data);
    },
    // Atomic compare-and-set: the status filter lives in the UPDATE's WHERE clause.
    async transition(id, fromStatuses, patch) {
      const { data, error } = await sb.from('requests').update(fromReq(patch)).eq('id', id).in('status', fromStatuses).select();
      fail(error); return data && data.length ? toReq(data[0]) : null;
    },
    async addRejection(id, mentorId) {
      const { error } = await sb.rpc('add_rejection', { p_request: id, p_mentor: mentorId }); fail(error);
    },
    async stats() {
      const [u, r] = await Promise.all([
        sb.from('profiles').select('*', { count: 'exact', head: true }),
        sb.from('requests').select('*', { count: 'exact', head: true })]);
      return { users: u.count || 0, requests: r.count || 0 };
    },
  };
};
