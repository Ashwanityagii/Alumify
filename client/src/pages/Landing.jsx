import { Link } from 'react-router-dom';
import { homeFor, useAuth } from '../auth.jsx';
import { Background, Icon, Logo } from '../ui.jsx';
import { LOGO_URL } from '../config.js';

const HERO_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMddRguxKjdEEw_bmd9XJA8bb4FqyCD9Zr_M65MqXa_RupnrcmXg6D7xDg0DUQSMwtLMgSTm8YvCH8OSELt6PP6KGE-HLcihYE29jVvmmSlBvyE7hCSN8SOvSAXt6PMuFuA65xOiRXCQLHWDEdw-PrCW9ESA0El8mmoNhHHc7N51BEIEqDBPHa2ZyqGRqqUk-TkxHoWtCL34Q993ent4p4iBaqpGCXALslyFqRVFYyOrZx6PUB-hlmRWvmPNFkxP8hxw';

const FEATURES = [
  ['coffee', '15-minute Coffee Talks', 'A quick, low-pressure chat with an alumnus about their path, their field, or a decision you are weighing.'],
  ['description', 'Resume Reviews', 'A focused 30-minute, line-by-line review from someone who has been on the hiring side.'],
  ['explore', 'Career Guidance', 'Thirty minutes of real direction on internships, placements, higher studies and switching tracks.'],
  ['groups', 'Faculty Batch Queries', 'Ask faculty about upcoming or running batches on the exact topic you want to learn.'],
  ['verified_user', 'Verified Network', 'Alumni and faculty are approved by an administrator before they can sign in. No cold DMs, no strangers.'],
  ['task_alt', 'Session Counters', 'Every student, alumnus and faculty member gets a counter that rises only when a session is truly completed.'],
];
const STEPS = [
  ['Create a request', 'Tell us your name, branch, year, the type of session and your topic. Pick a specific mentor or leave it open.'],
  ['A mentor responds', 'Alumni or faculty can accept, reject, or schedule it for later. You see the status live.'],
  ['Meet & complete', 'Once the session is done, the mentor marks it completed and both counters go up.'],
];
const ROLES = [
  ['school', 'Students', ['Create new requests in under a minute', 'Browse alumni and faculty profiles', 'Track every request and your session count']],
  ['workspace_premium', 'Alumni', ['See requests that match your expertise', 'Accept, reject or schedule for later', 'Watch your mentorship counter grow']],
  ['menu_book', 'Faculty', ['Receive upcoming / running batch queries', 'Accept and connect with students', 'See demand across batches at a glance']],
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <>
      <Background />
      <header className="lp-nav glass">
        <Link to="/" className="lp-brand"><span className={`logo-lg ${LOGO_URL ? 'img' : ''}`} style={{ width: 40, height: 40 }}><Logo size={40} /></span><span className="brand">Alumify</span></Link>
        <nav className="lp-links" aria-label="Sections"><a href="#features">Features</a><a href="#how">How it works</a><a href="#roles">Who it's for</a></nav>
        <div className="row" style={{ gap: 10 }}>
          {user ? <Link className="btn primary" to={homeFor(user.role)}>Open dashboard <Icon n="arrow_forward" /></Link>
            : <><Link className="btn lp-hide" to="/register">Sign up</Link><Link className="btn primary" to="/login">Login</Link></>}
        </div>
      </header>

      <main className="lp">
        <section className="lp-hero">
          <img className="lp-hero-img" src={HERO_IMG} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="lp-hero-copy">
            <span className="chip"><span className="dot-live" style={{ marginRight: 0 }} />Mentorship network for your campus</span>
            <h1 className="h1 lp-h1">Where students meet <em>alumni &amp; faculty</em></h1>
            <p className="lead">Alumify turns “I wish I could ask someone” into a booked conversation. Request a coffee talk, a resume review or career guidance, or bring your questions about batches to faculty.</p>
            <div className="row" style={{ gap: 14, marginTop: 28 }}>
              <Link className="btn primary xl" to={user ? homeFor(user.role) : '/register'}>{user ? 'Go to my dashboard' : 'Get started'} <Icon n="arrow_forward" /></Link>
              {!user && <Link className="btn xl" to="/login">Login</Link>}
            </div>
          </div>
          <div className="lp-float" aria-hidden="true">
            <div className="glass lp-card c1"><div className="eyebrow">Your mentorship sessions</div><div className="row" style={{ alignItems: 'baseline', gap: 8, margin: '6px 0' }}><span className="counter"><span className="num" style={{ fontSize: 44 }}>5</span></span><span className="small" style={{ fontWeight: 600 }}>completed</span></div><span className="pill">2 Coffee Chats</span> <span className="pill">3 Resume</span></div>
            <div className="glass lp-card c2"><div className="row between"><b className="small">Resume Review · 30 min</b><span className="badge scheduled">scheduled</span></div><p className="xs muted" style={{ margin: '6px 0 0' }}>“Resume for PM roles”</p><div className="inset small" style={{ padding: '7px 12px', marginTop: 10, fontWeight: 600 }}>Fri · 4:00 PM</div></div>
            <div className="glass lp-card c3"><div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}><div className="avatar">VM</div><div><b className="small">Vikram Malhotra</b><div className="xs muted">SWE II @ Google · '21</div></div></div><div className="row" style={{ marginTop: 12, gap: 8 }}><span className="btn sm primary" style={{ pointerEvents: 'none' }}>Accept</span><span className="btn sm" style={{ pointerEvents: 'none' }}>Schedule</span></div></div>
          </div>
        </section>

        <section id="features" className="lp-sec">
          <div className="lp-head"><span className="eyebrow">What you get</span><h2 className="h2 lp-h2">Everything a mentorship needs, nothing it doesn't</h2></div>
          <div className="lp-grid">{FEATURES.map(([i, t, d]) => (
            <article key={t} className="glass lift lp-feat"><div className="avatar soft" style={{ width: 48, height: 48, borderRadius: 16 }}><Icon n={i} /></div><h3 className="h3" style={{ margin: '16px 0 6px' }}>{t}</h3><p className="small muted" style={{ lineHeight: 1.65 }}>{d}</p></article>))}</div>
        </section>

        <section id="how" className="lp-sec">
          <div className="lp-head"><span className="eyebrow">How it works</span><h2 className="h2 lp-h2">From question to conversation in three steps</h2></div>
          <div className="lp-grid three">{STEPS.map(([t, d], i) => (
            <article key={t} className="glass panel lp-step"><span className="lp-num">{i + 1}</span><h3 className="h3" style={{ margin: '14px 0 6px' }}>{t}</h3><p className="small muted" style={{ lineHeight: 1.65 }}>{d}</p></article>))}</div>
        </section>

        <section id="roles" className="lp-sec">
          <div className="lp-head"><span className="eyebrow">One platform, three portals</span><h2 className="h2 lp-h2">Built for everyone in the room</h2></div>
          <div className="lp-grid three">{ROLES.map(([i, t, pts]) => (
            <article key={t} className="glass lift panel"><div className="row" style={{ gap: 12 }}><div className="avatar"><Icon n={i} /></div><h3 className="h2" style={{ fontSize: 24 }}>{t}</h3></div>
              <ul className="lp-list">{pts.map((p) => <li key={p}><Icon n="check_circle" />{p}</li>)}</ul></article>))}</div>
        </section>

        <section className="lp-sec">
          <div className="glass lp-cta">
            <h2 className="h2" style={{ fontSize: 'clamp(28px,3.6vw,40px)' }}>Ready to start a conversation?</h2>
            <p className="lead" style={{ margin: '10px auto 24px' }}>Join your campus network. Students sign up instantly; alumni and faculty are verified by an administrator.</p>
            <div className="row" style={{ justifyContent: 'center', gap: 14 }}><Link className="btn primary xl" to={user ? homeFor(user.role) : '/register'}>{user ? 'Open dashboard' : 'Create your account'}</Link>{!user && <Link className="btn xl" to="/login">Login</Link>}</div>
          </div>
        </section>
      </main>

      <footer className="lp-foot"><span className="brand" style={{ fontSize: 22 }}>Alumify</span><span className="small muted">Connecting students with alumni and faculty.</span><span className="small muted">Role-protected · encrypted sessions</span></footer>
    </>
  );
}
