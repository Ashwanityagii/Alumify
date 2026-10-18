// In-memory (file-persisted) adapter used when Supabase is not configured.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

module.exports = function createMemoryStore({ secret, file, seed = true } = {}) {
  const FILE = file || path.join(__dirname, '..', '..', 'data', 'db.json');
  let db = { users: [], requests: [] };
  const persist = file !== false;
  try { if (persist) db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { /* first run */ }
  const save = () => {
    if (!persist) return;
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(db, null, 2));
    fs.renameSync(FILE + '.tmp', FILE);
  };
  const uid = () => crypto.randomUUID();
  const clone = (x) => (x ? JSON.parse(JSON.stringify(x)) : x);
  const strip = ({ passHash, ...u }) => u;

  const sign = (id) => {
    const exp = Date.now() + 8 * 3600 * 1000;
    const body = `${id}.${exp}`;
    return `${body}.${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  };

  const store = {
    mode: 'memory',
    auth: {
      async login(email, password) {
        const u = db.users.find((x) => x.email === email.toLowerCase());
        const ok = await bcrypt.compare(password, u ? u.passHash : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid.');
        return u && ok ? { token: sign(u.id), userId: u.id } : null;
      },
      async register(email, password, profile) {
        if (db.users.some((x) => x.email === email)) return { error: 'An account with this email already exists' };
        const u = { id: uid(), email, passHash: await bcrypt.hash(password, 10), createdAt: new Date().toISOString(), ...profile };
        db.users.push(u); save();
        return { userId: u.id };
      },
      async verify(token) {
        const parts = String(token || '').split('.');
        if (parts.length !== 3) return null;
        const body = `${parts[0]}.${parts[1]}`;
        const expect = crypto.createHmac('sha256', secret).update(body).digest();
        let given; try { given = Buffer.from(parts[2], 'hex'); } catch { return null; }
        if (given.length !== expect.length || !crypto.timingSafeEqual(given, expect)) return null;
        if (Number(parts[1]) < Date.now()) return null;
        return parts[0];
      },
    },
    async getUser(id) { const u = db.users.find((x) => x.id === id); return u ? clone(strip(u)) : null; },
    async getUserByEmail(email) { const u = db.users.find((x) => x.email === email); return u ? clone(strip(u)) : null; },
    async listUsers() { return db.users.map((u) => clone(strip(u))); },
    async updateUser(id, patch) {
      const u = db.users.find((x) => x.id === id); if (!u) return null;
      Object.assign(u, patch); save(); return clone(strip(u));
    },
    async listRequests(f = {}) {
      return clone(db.requests.filter((r) =>
        (!f.studentId || r.studentId === f.studentId) &&
        (!f.mentorId || r.mentorId === f.mentorId) &&
        (!f.audience || r.audience === f.audience) &&
        (!f.status || r.status === f.status))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    async getRequest(id) { return clone(db.requests.find((r) => r.id === id) || null); },
    async createRequest(r) {
      const row = { id: uid(), status: 'pending', mentorId: null, rejectedBy: [], scheduledAt: null,
        acceptedAt: null, completedAt: null, createdAt: new Date().toISOString(), ...r };
      db.requests.push(row); save(); return clone(row);
    },
    // Atomic compare-and-set (single-threaded here; WHERE-clause update in Supabase).
    async transition(id, fromStatuses, patch) {
      const r = db.requests.find((x) => x.id === id);
      if (!r || !fromStatuses.includes(r.status)) return null;
      Object.assign(r, patch); save(); return clone(r);
    },
    async addRejection(id, mentorId) {
      const r = db.requests.find((x) => x.id === id);
      if (r && !r.rejectedBy.includes(mentorId)) { r.rejectedBy.push(mentorId); save(); }
    },
    async stats() {
      return { users: db.users.length, requests: db.requests.length };
    },
  };

  if (seed && db.users.length === 0) seedDemo(store, db, save, uid);
  return store;
};

function seedDemo(store, db, save, uid) {
  const h = (p) => bcrypt.hashSync(p, 10);
  const now = Date.now();
  const mk = (role, name, email, pw, extra) => {
    const u = { id: uid(), role, name, email, passHash: h(pw), status: 'active', createdAt: new Date(now - 30 * 864e5).toISOString(),
      branch: '', year: null, gradYear: null, headline: '', tags: [], ...extra };
    db.users.push(u); return u;
  };
  mk('admin', 'Alumify Admin', 'admin@alumify.dev', 'Admin@12345', { headline: 'Platform administrator' });
  const aryan = mk('student', 'Aryan Sengupta', 'aryan@alumify.dev', 'Student@123', { branch: 'CSE', year: '3rd Year' });
  const sneha = mk('student', 'Sneha Patel', 'sneha@alumify.dev', 'Student@123', { branch: 'ECE', year: '4th Year' });
  const vik = mk('alumni', 'Vikram Malhotra', 'vikram@alumify.dev', 'Alumni@123', { branch: 'CSE', gradYear: 2021,
    headline: 'Software Engineer II @ Google', tags: ['System Design', 'Distributed Systems', 'FAANG Transition'] });
  const priya = mk('alumni', 'Priya Sen', 'priya@alumify.dev', 'Alumni@123', { branch: 'EE', gradYear: 2017,
    headline: 'VP Quantitative Strategy @ Goldman Sachs', tags: ['Quant Finance', 'Algorithmic Trading', 'Financial Math'] });
  const rao = mk('faculty', 'Dr. Sandeep Rao', 'sandeep@alumify.dev', 'Faculty@123', { branch: 'EE & ScAI',
    headline: 'Assoc. Professor & AI Lab Head', tags: ['Deep Learning Theory', 'PhD Admissions', 'Research Grants'] });
  mk('alumni', 'Rhea Kapoor', 'rhea@alumify.dev', 'Alumni@123', { status: 'pending', branch: 'ME', gradYear: 2019, headline: 'Product Manager @ Atlassian', tags: ['Product'] });
  const ago = (h) => new Date(now - h * 36e5).toISOString();
  const base = (s, o) => ({ id: uid(), studentId: s.id, name: s.name, branch: s.branch, year: s.year, details: '', targetId: null,
    batchStatus: null, mentorId: null, rejectedBy: [], scheduledAt: null, acceptedAt: null, completedAt: null, ...o });
  db.requests.push(
    base(aryan, { type: 'guidance', audience: 'alumni', topic: 'SDE transition: system design study path for L4 loops', status: 'pending', createdAt: ago(4),
      details: 'Preparing for distributed systems interview loops; want to know how to structure a 3-month plan.' }),
    base(aryan, { type: 'resume', audience: 'alumni', topic: 'Resume review for SDE internships', status: 'completed', mentorId: priya.id, createdAt: ago(240), acceptedAt: ago(230), completedAt: ago(200) }),
    base(aryan, { type: 'coffee', audience: 'alumni', topic: 'Is off-campus hiring worth it?', status: 'completed', mentorId: vik.id, createdAt: ago(400), acceptedAt: ago(390), completedAt: ago(380) }),
    base(aryan, { type: 'coffee', audience: 'alumni', topic: 'Open source contributions as a 3rd year', status: 'completed', mentorId: vik.id, createdAt: ago(600), acceptedAt: ago(590), completedAt: ago(580) }),
    base(aryan, { type: 'batch', audience: 'faculty', batchStatus: 'running', topic: 'Distributed Consensus: Raft & Paxos deep dive', status: 'scheduled', mentorId: rao.id,
      scheduledAt: new Date(now + 3 * 864e5).toISOString(), createdAt: ago(30), acceptedAt: ago(20),
      details: 'Batch 2025 Systems Track requests a 90-minute guest lecture on leader election and log replication.' }),
    base(sneha, { type: 'batch', audience: 'faculty', batchStatus: 'upcoming', topic: 'CUDA kernels & LLM inference optimization lab', status: 'pending', createdAt: ago(5),
      details: 'Hands-on workshop for the upcoming HPC batch.' }),
    base(sneha, { type: 'coffee', audience: 'alumni', topic: 'Breaking into quant roles from ECE', status: 'pending', createdAt: ago(9), targetId: priya.id }),
    base(sneha, { type: 'guidance', audience: 'alumni', topic: 'MS abroad vs. industry: how to decide', status: 'pending', createdAt: ago(2) }),
  );
  save();
}
