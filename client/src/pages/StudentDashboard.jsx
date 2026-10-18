import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Avatar, Badge, Empty, Icon, Loading, PageHead, SessionCounter, TYPE_ICON, ago, fmtDate, matches, useLoad, useSearch, useToast } from '../ui.jsx';

export function ReqItem({ r, onCancel }) {
  return (
    <div className={`reqitem ${r.status === 'scheduled' ? 'sched' : ''}`}>
      <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <div className="avatar soft"><Icon n={TYPE_ICON[r.type]} className="" /></div>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>{r.typeLabel}{r.minutes ? ` · ${r.minutes} min` : ''}</div>
            <div className="eyebrow" style={{ marginTop: 2 }}>{r.type === 'batch' ? `${r.batchStatus} batch` : 'Alumni mentorship'}{r.targetName ? ` · to ${r.targetName}` : ''}</div></div>
        </div>
        <Badge s={r.status} />
      </div>
      <p className="small" style={{ margin: '10px 0 0', color: 'var(--ink-2)' }}>“{r.topic}”</p>
      {r.status === 'scheduled' && r.scheduledAt && (
        <div className="inset row between" style={{ padding: '9px 13px', marginTop: 10 }}><span className="small" style={{ fontWeight: 600 }}><Icon n="calendar_today" className="" /> {fmtDate(r.scheduledAt)}</span><span className="xs muted">{r.mentorName}</span></div>)}
      {['accepted', 'scheduled', 'completed'].includes(r.status) && r.mentorName && (
        <p className="xs" style={{ marginTop: 10, color: 'var(--emerald)', fontWeight: 700 }}>
          {r.status === 'completed' ? `+1 session completed with ${r.mentorName}` : `Connected with ${r.mentorName}`}{r.mentorEmail && r.status !== 'completed' && <> · <a href={`mailto:${r.mentorEmail}`} style={{ textDecoration: 'underline' }}>{r.mentorEmail}</a></>}</p>)}
      <div className="meta"><span><Icon n="schedule" className="" style={{ fontSize: 14 }} /> Sent {ago(r.createdAt)}</span>
        {r.status === 'pending' ? (onCancel ? <button className="btn sm danger" onClick={() => onCancel(r)}>Cancel request</button> : <span>Awaiting {r.audience === 'faculty' ? 'faculty' : 'alumni'}</span>) : <span>{r.status === 'declined' ? 'Mentor declined' : ''}</span>}</div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth(); const toast = useToast(); const q = useSearch();
  const { data, error, reload } = useLoad('/student/overview'); const [filter, setFilter] = useState('all');
  if (error && !data) return <div className="alert err">{error}</div>;
  if (!data) return <Loading />;
  const dir = data.directory.filter((m) => (filter === 'all' || m.role === filter) && matches(q, m.name, m.headline, m.branch, ...(m.tags || [])));
  const reqs = data.requests.filter((r) => matches(q, r.topic, r.typeLabel, r.mentorName));
  const cancel = async (r) => {
    if (!window.confirm('Cancel this request?')) return;
    try { await api(`/student/requests/${r.id}/cancel`, { method: 'POST' }); toast('Request cancelled'); reload(); } catch (e) { toast(e.message, true); }
  };
  const slots = Math.max(0, data.maxOpen - data.open);
  return (
    <>
      <PageHead eyebrow="Student Portal" title="Welcome back," em={user.name.split(' ')[0]}
        right={<div className="row" style={{ gap: 22, alignItems: 'center' }}>
          <SessionCounter counter={data.counter} label="Your mentorship sessions" noun="sessions completed" />
          <div style={{ textAlign: 'center' }}>
            <Link to="/student/new" className="btn primary xl"><Icon n="add" />Create New Request</Link>
            <p className="xs muted" style={{ marginTop: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}><span className="dot-live" />Slot {Math.min(data.open + 1, data.maxOpen)} of {data.maxOpen} · {slots} open</p>
          </div></div>}>
        Request a 15-minute coffee talk, a resume review or a guidance session with alumni, or ask faculty about an upcoming or running batch.
      </PageHead>
      <div className="cols">
        <div id="directory">
          <div className="section-head"><div><h2 className="h2">Mentors &amp; Faculty</h2><p className="small muted">Pick someone specific, or create an open request any matching mentor can accept.</p></div>
            <div className="filters">{[['all', 'Everyone'], ['alumni', 'Alumni'], ['faculty', 'Faculty']].map(([k, l]) => <button key={k} className={`fchip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}</div></div>
          {dir.length === 0 && <div className="glass panel"><Empty icon="search_off">No mentors match your search.</Empty></div>}
          {dir.map((m) => (
            <article key={m.id} className="glass lift mentor">
              <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 16 }}>
                <Avatar name={m.name} lg />
                <div className="grow"><div className="row" style={{ gap: 8 }}><h3 className="h3">{m.name}</h3><span className="eyebrow">{m.role === 'faculty' ? 'Faculty Circle' : `B.Tech '${String(m.gradYear).slice(2)} · ${m.branch}`}</span></div>
                  <p style={{ fontWeight: 600, color: 'var(--ink-2)', margin: '2px 0 0' }}>{m.headline}</p></div>
              </div>
              <div className="row" style={{ marginTop: 14, gap: 8 }}>{(m.tags || []).map((t) => <span className="pill" key={t}>{t}</span>)}</div>
              <div className="foot"><span className="small"><span className="dot-live" />{m.role === 'faculty' ? 'Accepting batch queries' : 'Accepting mentorship requests'}</span>
                <Link className="btn sm primary" to={`/student/new?to=${m.id}`}>Request Mentorship</Link></div>
            </article>))}
        </div>
        <aside className="glass panel">
          <div className="row between" style={{ paddingBottom: 16, borderBottom: '1px solid var(--line)', marginBottom: 16 }}>
            <div><h2 className="h2" style={{ fontSize: 22 }}>My Requests</h2><p className="xs muted">Live status of every request</p></div>
            <span className="pill">{data.open} active</span></div>
          {reqs.length === 0 && <Empty icon="forum">No requests yet.<br />Hit “Create New Request” to start.</Empty>}
          {reqs.slice(0, 6).map((r) => <ReqItem key={r.id} r={r} onCancel={cancel} />)}
          {reqs.length > 6 && <Link className="btn block sm" to="/student/requests">View all {reqs.length} requests</Link>}
          <div className="note" style={{ marginTop: 14 }}><Icon n="verified_user" className="" /><span><b>Anti-spam standard.</b> Up to {data.maxOpen} open requests at a time. Contact details are shared only after a mentor accepts.</span></div>
        </aside>
      </div>
    </>
  );
}
