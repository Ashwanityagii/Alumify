// Shared business rules & validation for Alumify.
const TYPES = {
  coffee:   { label: '15 min Coffee Talk', minutes: 15, audience: 'alumni' },
  resume:   { label: 'Resume Review',      minutes: 30, audience: 'alumni' },
  guidance: { label: 'Guidance Session',   minutes: 30, audience: 'alumni' },
  batch:    { label: 'Batch Query',        minutes: null, audience: 'faculty' },
};
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year / Dual Degree', 'Postgraduate'];
const ROLES = ['student', 'alumni', 'faculty', 'admin'];
const BATCH_STATUS = ['upcoming', 'running'];
const MAX_OPEN_REQUESTS = 5; // anti-spam: open requests per student
const OPEN = ['pending', 'accepted', 'scheduled'];

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (m) => new HttpError(400, m);

const clean = (v, min, max, label) => {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
  if (s.length < min || s.length > max) throw bad(`${label} must be ${min}-${max} characters`);
  return s;
};

function validateRequest(body, targetUser) {
  const name = clean(body.name, 2, 80, 'Name');
  const branch = clean(body.branch, 2, 60, 'Branch');
  if (!YEARS.includes(body.year)) throw bad('Please choose a valid year');
  const topic = clean(body.topic, 3, 200, 'Topic');
  const details = body.details ? clean(body.details, 0, 1000, 'Details') : '';
  let audience = targetUser ? targetUser.role : body.audience;
  if (!['alumni', 'faculty'].includes(audience)) throw bad('Choose alumni or faculty');
  let type, batchStatus = null;
  if (audience === 'alumni') {
    type = body.type;
    if (!TYPES[type] || TYPES[type].audience !== 'alumni') throw bad('Choose a request type: coffee talk, resume review or guidance');
  } else {
    type = 'batch';
    batchStatus = body.batchStatus;
    if (!BATCH_STATUS.includes(batchStatus)) throw bad('Choose upcoming or running batch');
  }
  return { name, branch, year: body.year, type, topic, details, audience, batchStatus, targetId: targetUser ? targetUser.id : null };
}

const isEmail = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function validateRegistration(b) {
  if (!isEmail(b.email)) throw bad('Enter a valid email');
  if (typeof b.password !== 'string' || b.password.length < 8 || b.password.length > 72) throw bad('Password must be 8-72 characters');
  if (!['student', 'alumni', 'faculty'].includes(b.role)) throw bad('Choose student, alumni or faculty');
  const p = {
    email: b.email.trim().toLowerCase(),
    role: b.role,
    name: clean(b.name, 2, 80, 'Name'),
    branch: clean(b.branch, 2, 60, 'Branch / department'),
    year: null, gradYear: null, headline: '', tags: [],
  };
  if (b.role === 'student') {
    if (!YEARS.includes(b.year)) throw bad('Choose your year');
    p.year = b.year;
  } else {
    p.headline = clean(b.headline, 3, 120, 'Headline (role / company)');
    p.tags = String(b.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5).map((t) => t.slice(0, 30));
    if (b.role === 'alumni') {
      const g = Number(b.gradYear);
      if (!Number.isInteger(g) || g < 1950 || g > new Date().getFullYear() + 1) throw bad('Enter a valid graduation year');
      p.gradYear = g;
    }
  }
  // Students are active immediately; alumni & faculty need admin verification.
  p.status = b.role === 'student' ? 'active' : 'pending';
  return p;
}

const publicUser = (u) => u && ({
  id: u.id, name: u.name, email: u.email, role: u.role, status: u.status,
  branch: u.branch, year: u.year, gradYear: u.gradYear, headline: u.headline, tags: u.tags || [],
});

const countCompleted = (reqs) => {
  const out = { total: 0, coffee: 0, resume: 0, guidance: 0, batch: 0 };
  for (const r of reqs) if (r.status === 'completed') { out.total++; out[r.type]++; }
  return out;
};

module.exports = { TYPES, YEARS, ROLES, BATCH_STATUS, MAX_OPEN_REQUESTS, OPEN, HttpError, bad, clean,
  validateRequest, validateRegistration, publicUser, countCompleted, isEmail };
