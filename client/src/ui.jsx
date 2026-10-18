import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import { useAuth } from './auth.jsx';
import { LOGO_URL } from './config.js';

import { GraduationCap, LayoutDashboard, PlusCircle, MessageSquare, Users, LogOut, Search, BadgeCheck, ArrowRight, Eye, EyeOff, CheckCircle2, Plus,
  CalendarDays, Clock, Coffee, FileText, Compass, Send, User, ShieldCheck, MinusCircle, CalendarClock, ListChecks, Inbox, SearchX, CalendarCheck, Award,
  BookOpen, X, UserPlus, Check, Mail } from 'lucide-react';

const ICONS = { school: GraduationCap, space_dashboard: LayoutDashboard, add_circle: PlusCircle, forum: MessageSquare, group: Users, groups: Users, logout: LogOut,
  search: Search, verified: BadgeCheck, arrow_forward: ArrowRight, visibility: Eye, visibility_off: EyeOff, check_circle: CheckCircle2, add: Plus,
  calendar_today: CalendarDays, schedule: Clock, coffee: Coffee, description: FileText, explore: Compass, send: Send, person: User, verified_user: ShieldCheck,
  do_not_disturb_on: MinusCircle, event: CalendarClock, task_alt: ListChecks, inbox: Inbox, search_off: SearchX, event_available: CalendarCheck,
  workspace_premium: Award, menu_book: BookOpen, close: X, person_add: UserPlus, check: Check, mail: Mail };
export const Icon = ({ n, className = '', style }) => { const C = ICONS[n] || BadgeCheck; return <C className={`ms ${className}`} style={style} strokeWidth={2} aria-hidden="true" />; };

// Brand mark: the configured logo image if LOGO_URL is set, otherwise the default icon.
export function Logo({ size }) {
  const [broken, setBroken] = useState(false);
  if (LOGO_URL && !broken) return <img src={LOGO_URL} alt="Alumify" onError={() => setBroken(true)} referrerPolicy="no-referrer"
    style={{ width: size, height: size, maxWidth: '100%', objectFit: 'contain', display: 'block' }} />;
  return <Icon n="school" />;
}

export function Background() {
  return (
    <div className="bg" aria-hidden="true">
      <i className="blob b1" /><i className="blob b2" /><i className="blob b3" /><i className="blob b4" />
    </div>
  );
}

/* ---------- helpers ---------- */
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
export const fmtDate = (iso) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export function ago(iso) {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.floor(s / 60) || 1}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
export const TYPE_ICON = { coffee: 'coffee', resume: 'description', guidance: 'explore', batch: 'groups' };
export const Badge = ({ s }) => <span className={`badge ${s}`}>{s === 'completed' && <Icon n="check_circle" className="" />}{s}</span>;
export const Avatar = ({ name, lg, soft }) => <div className={`avatar ${lg ? 'lg' : ''} ${soft ? 'soft' : ''}`}>{initials(name)}</div>;
export const Empty = ({ icon = 'inbox', children }) => <div className="empty"><Icon n={icon} />{children}</div>;
export const Loading = () => <div className="spin" role="status" aria-label="Loading" />;

export function useLoad(path) {
  const [st, set] = useState({ data: null, error: null, loading: true });
  const load = useCallback(() => api(path)
    .then((d) => set({ data: d, error: null, loading: false }))
    .catch((e) => set((s) => ({ data: s.data, error: e.message, loading: false }))), [path]);
  useEffect(() => { load(); }, [load]);
  return { ...st, reload: load };
}

/* ---------- toast ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [t, setT] = useState(null); const timer = useRef();
  const show = useCallback((msg, err = false) => { setT({ msg, err }); clearTimeout(timer.current); timer.current = setTimeout(() => setT(null), 3800); }, []);
  return <ToastCtx.Provider value={show}>{children}{t && <div className={`toast ${t.err ? 'err' : ''}`} role="status">{t.msg}</div>}</ToastCtx.Provider>;
}

/* ---------- header search (client-side filter) ---------- */
const SearchCtx = createContext('');
export const useSearch = () => useContext(SearchCtx);
export const matches = (q, ...fields) => !q || fields.filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase());

const NAV = {
  student: [{ to: '/student', icon: 'space_dashboard', tip: 'Dashboard', end: true }, { to: '/student/new', icon: 'add_circle', tip: 'New request' }, { to: '/student/requests', icon: 'forum', tip: 'My requests' }],
  alumni: [{ to: '/alumni', icon: 'forum', tip: 'Inquiries & sessions', end: true }],
  faculty: [{ to: '/faculty', icon: 'school', tip: 'Batch queries', end: true }],
  admin: [{ to: '/admin', icon: 'space_dashboard', tip: 'Overview', end: true }, { to: '/admin/users', icon: 'group', tip: 'Users' }, { to: '/admin/requests', icon: 'forum', tip: 'All requests' }],
};
const CHIP = { student: 'Student Portal', alumni: 'Alumni Portal', faculty: 'Faculty Portal', admin: 'Admin Console' };

export function Shell({ children, searchable = true }) {
  const { user, logout } = useAuth(); const nav = useNavigate(); const [q, setQ] = useState('');
  const sub = useMemo(() => user.role === 'student' ? `${user.branch} · ${user.year}` : user.role === 'alumni' ? `${user.branch} · Class of ${user.gradYear}` : user.role === 'faculty' ? user.branch : 'Administrator', [user]);
  return (
    <>
      <Background />
      <aside className="dock glass" aria-label="Primary">
        <div className={`logo ${LOGO_URL ? 'img' : ''}`}><Logo size={46} /></div><div className="tag">Alumify</div>
        <nav>
          {NAV[user.role].map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} data-tip={i.tip} aria-label={i.tip} className={({ isActive }) => (isActive ? 'active' : '')}><Icon n={i.icon} /></NavLink>
          ))}
        </nav>
        <button className="dk" data-tip="Sign out" aria-label="Sign out" onClick={() => { logout(); nav('/login'); }}><Icon n="logout" /></button>
      </aside>
      <header className="topbar glass">
        <div className="brand">Alumify<i>/</i></div>
        <span className="chip hide-sm"><Icon n="verified" />{CHIP[user.role]}</span>
        {searchable && <div className="search"><Icon n="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names, topics, skills…" aria-label="Search" /></div>}
        <div className="usercard"><div style={{ textAlign: 'right' }}><b>{user.name}</b><small>{sub}</small></div><Avatar name={user.name} /></div>
      </header>
      <SearchCtx.Provider value={q}><main className="main">{children}</main></SearchCtx.Provider>
    </>
  );
}

export function PageHead({ eyebrow, title, em, children, right }) {
  return (
    <section className="glass hero">
      <div className="hero-row">
        <div style={{ maxWidth: 720 }}>
          <span className="chip" style={{ marginBottom: 14 }}><span className="dot-live" style={{ marginRight: 0 }} />{eyebrow}</span>
          <h1 className="h1">{title} {em && <em>{em}</em>}</h1>
          {children && <p className="lead" style={{ marginTop: 12 }}>{children}</p>}
        </div>
        {right}
      </div>
    </section>
  );
}

export function SessionCounter({ counter, label, dark, noun, faculty }) {
  return (
    <div className={`counter ${dark ? 'dark' : ''}`}>
      <div className="row between"><span className="eyebrow">{label}</span><span className="pill" style={{ fontSize: 11 }}><Icon n="verified" className="" />Counts on completion</span></div>
      <div className="row" style={{ alignItems: 'baseline', margin: '10px 0 12px', gap: 10 }}><span className="num">{counter.total}</span><span className="small" style={{ fontWeight: 600 }}>{noun}</span></div>
      <div className="row" style={{ gap: 7 }}>
        {faculty ? <span className="pill">{counter.batch} Batch Sessions</span> : <>
          <span className="pill">{counter.coffee} Coffee Chats</span><span className="pill">{counter.resume} Resume Reviews</span><span className="pill">{counter.guidance} Guidance</span>
          {counter.batch > 0 && <span className="pill">{counter.batch} Batch Sessions</span>}</>}
      </div>
    </div>
  );
}
export { Link };
