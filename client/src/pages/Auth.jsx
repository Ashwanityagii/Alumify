import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { homeFor, useAuth } from '../auth.jsx';
import { Background, Icon, Logo } from '../ui.jsx';
import { LOGO_URL } from '../config.js';

const BG_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMddRguxKjdEEw_bmd9XJA8bb4FqyCD9Zr_M65MqXa_RupnrcmXg6D7xDg0DUQSMwtLMgSTm8YvCH8OSELt6PP6KGE-HLcihYE29jVvmmSlBvyE7hCSN8SOvSAXt6PMuFuA65xOiRXCQLHWDEdw-PrCW9ESA0El8mmoNhHHc7N51BEIEqDBPHa2ZyqGRqqUk-TkxHoWtCL34Q993ent4p4iBaqpGCXALslyFqRVFYyOrZx6PUB-hlmRWvmPNFkxP8hxw';
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year / Dual Degree', 'Postgraduate'];
const ROLES = [['student', 'Student'], ['alumni', 'Alumni'], ['faculty', 'Faculty']];
const LOGIN_ROLES = [...ROLES, ['admin', 'Admin']]; // login page only: Admin sits next to Faculty

function Frame({ children }) {
  return (<><Background /><div className="page-bare"><img className="authbg" src={BG_IMG} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />{children}</div></>);
}
const Brand = ({ sub }) => (
  <div style={{ textAlign: 'center', marginBottom: 26 }}>
    <Link to="/" className="row" style={{ justifyContent: 'center', gap: 12 }} aria-label="Alumify home"><div className={`logo-lg ${LOGO_URL ? 'img' : ''}`}><Logo size={54} /></div><span className="brand" style={{ fontSize: 40 }}>Alumify</span></Link>
    <p className="muted" style={{ marginTop: 10 }}>{sub}</p>
  </div>
);
function PasswordField({ value, onChange, label = 'Password', autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <label className="f"><span>{label}</span>
      <div className="pw"><input type={show ? 'text' : 'password'} value={value} onChange={onChange} required minLength={8} maxLength={72} autoComplete={autoComplete} placeholder="••••••••" />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}><Icon n={show ? 'visibility_off' : 'visibility'} /></button></div>
    </label>
  );
}
const RoleSeg = ({ value, onChange, roles = ROLES }) => (
  <div className="seg" role="radiogroup" aria-label="I am a">
    {roles.map(([k, l]) => <button type="button" role="radio" aria-checked={value === k} key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>)}
  </div>
);

export function Login({ admin = false }) {
  const { login } = useAuth(); const nav = useNavigate();
  const [role, setRole] = useState(admin ? 'admin' : 'student'); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    const isAdmin = role === 'admin'; // Admin tab uses the dedicated admin endpoint
    try { const u = await login(email, password, isAdmin ? undefined : role, isAdmin); nav(homeFor(u.role), { replace: true }); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Frame>
      <form className="glass authcard stack" onSubmit={submit} style={{ gap: 18 }}>
        <Brand sub={role === 'admin' ? 'Administrator sign-in' : 'Connecting students with alumni & faculty'} />
        <RoleSeg value={role} onChange={(r) => { setRole(r); setErr(''); }} roles={LOGIN_ROLES} />
        {err && <div className="alert err" role="alert">{err}</div>}
        <label className="f"><span>Email</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" autoComplete="username" maxLength={254} /></label>
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <button className="btn primary xl block" disabled={busy}>{busy ? 'Signing in…' : <>Enter Alumify <Icon n="arrow_forward" /></>}</button>
        {role === 'admin' && <p className="small muted" style={{ textAlign: 'center' }}>No admin account yet? <Link to="/admin/register" style={{ color: 'var(--ink)', fontWeight: 700 }}>Create admin account</Link></p>}
        {role !== 'admin' && <p className="small muted" style={{ textAlign: 'center' }}>New here? <Link to="/register" style={{ color: 'var(--ink)', fontWeight: 700 }}>Create an account</Link></p>}
        <p className="xs muted" style={{ textAlign: 'center', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600 }}>Role-protected · encrypted sessions</p>
      </form>
    </Frame>
  );
}
export const AdminLogin = () => <Login admin />;

export function Register() {
  const [f, setF] = useState({ role: 'student', name: '', email: '', password: '', branch: '', year: '3rd Year', gradYear: '', headline: '', tags: '' });
  const [err, setErr] = useState(''); const [done, setDone] = useState(null); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const d = await api('/auth/register', { method: 'POST', body: f }); setDone(d); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  if (done) return (
    <Frame><div className="glass authcard stack" style={{ textAlign: 'center' }}>
      <Brand sub="Account created" />
      <div className="alert ok">{done.pending ? 'Thanks! An administrator will verify your alumni/faculty account shortly. You can sign in once it is approved.' : 'You can now sign in.'}</div>
      <Link className="btn primary xl" to="/login">Go to sign in</Link></div></Frame>
  );
  return (
    <Frame>
      <form className="glass authcard stack" onSubmit={submit} style={{ maxWidth: 620 }}>
        <Brand sub="Create your Alumify account" />
        <RoleSeg value={f.role} onChange={(role) => setF({ ...f, role })} />
        {err && <div className="alert err" role="alert">{err}</div>}
        <div className="grid2">
          <label className="f"><span>Full name</span><input required value={f.name} onChange={set('name')} minLength={2} maxLength={80} autoComplete="name" /></label>
          <label className="f"><span>{f.role === 'faculty' ? 'Department' : 'Branch'}</span><input required value={f.branch} onChange={set('branch')} minLength={2} maxLength={60} placeholder="e.g. CSE" /></label>
        </div>
        {f.role === 'student' && <label className="f"><span>Year</span><select value={f.year} onChange={set('year')}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select></label>}
        {f.role === 'alumni' && <label className="f"><span>Graduation year</span><input type="number" required min="1950" max={new Date().getFullYear() + 1} value={f.gradYear} onChange={set('gradYear')} placeholder="2020" /></label>}
        {f.role !== 'student' && <>
          <label className="f"><span>Headline (role @ company / designation)</span><input required value={f.headline} onChange={set('headline')} minLength={3} maxLength={120} placeholder="Software Engineer @ Google" /></label>
          <label className="f"><span>Topics you can help with (comma separated)</span><input value={f.tags} onChange={set('tags')} placeholder="System Design, Resume Review" /></label>
          <div className="note"><Icon n="verified_user" className="" /><span>Alumni and faculty accounts are verified by an administrator before they can sign in.</span></div></>}
        <label className="f"><span>Email</span><input type="email" required value={f.email} onChange={set('email')} maxLength={254} autoComplete="email" /></label>
        <PasswordField value={f.password} onChange={set('password')} label="Password (8+ characters)" autoComplete="new-password" />
        <button className="btn primary xl block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="small muted" style={{ textAlign: 'center' }}>Already registered? <Link to="/login" style={{ color: 'var(--ink)', fontWeight: 700 }}>Sign in</Link></p>
      </form>
    </Frame>
  );
}

export function AdminRegister() {
  const [f, setF] = useState({ name: '', email: '', password: '', adminCode: '' });
  const [err, setErr] = useState(''); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api('/auth/admin-register', { method: 'POST', body: f }); setDone(true); }
    catch (x) { setErr(x.status === 404 ? 'Admin signup is not enabled. Set ADMIN_SIGNUP_CODE in the .env file and restart the server.' : x.message); }
    finally { setBusy(false); }
  };
  if (done) return (
    <Frame><div className="glass authcard stack" style={{ textAlign: 'center' }}>
      <Brand sub="Admin account created" />
      <div className="alert ok">Done! Choose the Admin tab on the login page and sign in.</div>
      <Link className="btn primary xl" to="/login">Go to sign in</Link></div></Frame>
  );
  return (
    <Frame>
      <form className="glass authcard stack" onSubmit={submit}>
        <Brand sub="Create an administrator account" />
        {err && <div className="alert err" role="alert">{err}</div>}
        <label className="f"><span>Full name</span><input required value={f.name} onChange={set('name')} minLength={2} maxLength={80} autoComplete="name" /></label>
        <label className="f"><span>Email</span><input type="email" required value={f.email} onChange={set('email')} maxLength={254} autoComplete="email" /></label>
        <PasswordField value={f.password} onChange={set('password')} label="Password (10+ characters)" autoComplete="new-password" />
        <label className="f"><span>Admin code (ADMIN_SIGNUP_CODE from .env)</span><input type="password" required value={f.adminCode} onChange={set('adminCode')} autoComplete="off" /></label>
        <button className="btn primary xl block" disabled={busy}>{busy ? 'Creating…' : 'Create admin account'}</button>
        <p className="small muted" style={{ textAlign: 'center' }}><Link to="/login" style={{ color: 'var(--ink)', fontWeight: 700 }}>Back to sign in</Link></p>
      </form>
    </Frame>
  );
}
