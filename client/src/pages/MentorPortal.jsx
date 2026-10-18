import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Avatar, Badge, Empty, Icon, Loading, PageHead, SessionCounter, TYPE_ICON, ago, fmtDate, matches, useLoad, useSearch, useToast } from '../ui.jsx';

const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function Actions({ role, r, onDone }) {
  const toast = useToast(); const [when, setWhen] = useState(''); const [busy, setBusy] = useState(false);
  const call = async (action, body, msg) => {
    setBusy(true);
    try { await api(`/${role}/requests/${r.id}/${action}`, { method: 'POST', body }); toast(msg); onDone(); }
    catch (e) { toast(e.message, true); onDone(); } finally { setBusy(false); }
  };
  const min = toLocalInput(new Date(Date.now() + 5 * 60000));
  return (
    <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
      <button className="btn danger" disabled={busy} onClick={() => window.confirm('Decline this request?') && call('reject', undefined, 'Request declined')}><Icon n="do_not_disturb_on" />{role === 'faculty' ? 'Decline' : 'Reject'}</button>
      <details className="sched">
        <summary><span className="btn block"><Icon n="event" />Schedule for later</span></summary>
        <form className="pop" onSubmit={(e) => { e.preventDefault(); call('schedule', { scheduledAt: new Date(when).toISOString() }, 'Session scheduled'); }}>
          <input type="datetime-local" required min={min} value={when} onChange={(e) => setWhen(e.target.value)} style={{ flex: 1, minWidth: 200 }} aria-label="Session date and time" />
          <button className="btn primary" disabled={busy || !when}>Confirm time</button></form>
      </details>
      <button className="btn primary" disabled={busy} onClick={() => call('accept', undefined, role === 'faculty' ? 'Connected — student notified' : 'Accepted — student notified')}><Icon n="check_circle" />{role === 'faculty' ? 'Accept & Connect' : 'Accept'}</button>
    </div>
  );
}

function SessionCard({ role, r, onDone }) {
  const toast = useToast(); const [busy, setBusy] = useState(false);
  const complete = async () => {
    if (!window.confirm('Mark this session as completed? This increments both counters and cannot be undone.')) return;
    setBusy(true); try { await api(`/${role}/requests/${r.id}/complete`, { method: 'POST' }); toast('Session completed — counters updated'); onDone(); } catch (e) { toast(e.message, true); onDone(); } finally { setBusy(false); }
  };
  return (
    <div className={`reqitem ${r.status === 'scheduled' ? 'sched' : ''}`}>
      <div className="row between" style={{ flexWrap: 'nowrap' }}>
        <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar name={r.name} soft /><div><b style={{ fontSize: 14 }}>{r.name}</b><div className="eyebrow">{r.branch} · {r.year}</div></div></div><Badge s={r.status} /></div>
      <p className="small" style={{ margin: '10px 0 0' }}><b>{r.typeLabel}{r.minutes ? ` · ${r.minutes} min` : ''}</b> — “{r.topic}”</p>
      {r.status === 'scheduled' && r.scheduledAt && <div className="inset small" style={{ padding: '8px 13px', marginTop: 10, fontWeight: 600 }}><Icon n="calendar_today" className="" /> {fmtDate(r.scheduledAt)}</div>}
      {r.studentEmail && <p className="xs" style={{ marginTop: 10 }}>Contact: <a href={`mailto:${r.studentEmail}`} style={{ textDecoration: 'underline', fontWeight: 600 }}>{r.studentEmail}</a></p>}
      <div className="meta"><span>{r.status === 'completed' ? `Completed ${ago(r.completedAt)}` : `Received ${ago(r.createdAt)}`}</span>
        {['accepted', 'scheduled'].includes(r.status) && <button className="btn sm primary" disabled={busy} onClick={complete}><Icon n="task_alt" />Mark completed</button>}</div>
    </div>
  );
}

export default function MentorPortal({ role }) {
  const { user } = useAuth(); const q = useSearch();
  const { data, error, reload } = useLoad(`/${role}/overview`);
  const [view, setView] = useState('incoming'); const [filter, setFilter] = useState('all'); const [sel, setSel] = useState(null);
  const incoming = useMemo(() => (data ? data.incoming.filter((r) => (filter === 'all' || r.type === filter || r.batchStatus === filter) && matches(q, r.name, r.topic, r.branch, r.details)) : []), [data, filter, q]);
  if (error && !data) return <div className="alert err">{error}</div>;
  if (!data) return <Loading />;
  const selected = incoming.find((r) => r.id === sel) || incoming[0];
  const mine = data.sessions.filter((r) => matches(q, r.name, r.topic));
  const active = mine.filter((r) => ['accepted', 'scheduled'].includes(r.status)), history = mine.filter((r) => r.status === 'completed');
  const isAlumni = role === 'alumni';
  const chips = isAlumni ? [['all', 'All incoming'], ['coffee', 'Coffee talk'], ['resume', 'Resume review'], ['guidance', 'Guidance']] : [['all', 'All requests'], ['upcoming', 'Upcoming batch'], ['running', 'Running batch']];
  const done = () => reload();

  const stats = (
    <div className="row" style={{ gap: 16, alignItems: 'stretch' }}>
      <SessionCounter dark faculty={!isAlumni} counter={data.counter} label={isAlumni ? 'Sessions mentored' : 'Sessions conducted'} noun={isAlumni ? 'mentorship sessions' : 'sessions with students'} />
      <div className="stack" style={{ gap: 12 }}>
        <div className="glass stat"><span className="eyebrow">Pending queue</span><b>{data.stats.pending}</b></div>
        <div className="glass stat"><span className="eyebrow">Active / scheduled</span><b>{data.stats.active}</b></div></div>
    </div>);

  const Detail = ({ r }) => (
    <section className="glass panel" style={{ padding: 32 }}>
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 18 }}>
        <Avatar name={r.name} lg />
        <div className="grow"><h2 className="h2" style={{ fontSize: 30 }}>{r.name}</h2><p className="muted" style={{ fontWeight: 600 }}>{r.branch} · {r.year}</p>
          <div className="row" style={{ marginTop: 10 }}><span className="pill dark"><Icon n={TYPE_ICON[r.type]} className="" />{r.typeLabel}{r.minutes ? ` · ${r.minutes} min` : ''}</span>{r.targetName && <span className="pill">Addressed to you</span>}</div></div>
      </div>
      <div className="eyebrow" style={{ margin: '26px 0 10px' }}>Inquiry topic &amp; context</div>
      <div className="quote"><b>{r.topic}</b>{r.details && <p style={{ marginTop: 8, color: 'var(--ink-2)' }}>{r.details}</p>}</div>
      <p className="xs muted" style={{ margin: '14px 4px 22px' }}><Icon n="schedule" className="" style={{ fontSize: 14 }} /> Submitted {ago(r.createdAt)}. Contact details unlock once you accept.</p>
      <Actions role={role} r={r} onDone={done} />
    </section>);

  return (
    <>
      <PageHead eyebrow={isAlumni ? 'Alumni Portal' : 'Faculty Portal'} title={isAlumni ? 'Mentorship' : 'Batch'} em={isAlumni ? 'Inquiries' : 'Queries'} right={stats}>
        {isAlumni ? `Review requests from students, accept, decline or schedule for later, ${user.name.split(' ')[0]}. Your counter rises each time you complete a session.`
          : 'Students ask about upcoming and running batches here. Accept to connect, or schedule a session for later.'}
      </PageHead>
      <div className="row between" style={{ marginBottom: 20 }}>
        <div className="seg" style={{ minWidth: 320 }}><button className={view === 'incoming' ? 'on' : ''} onClick={() => setView('incoming')}>Incoming ({data.incoming.length})</button>
          <button className={view === 'mine' ? 'on' : ''} onClick={() => setView('mine')}>My sessions ({data.sessions.length})</button></div>
        {view === 'incoming' && <div className="filters">{chips.map(([k, l]) => <button key={k} className={`fchip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}</div>}
      </div>

      {view === 'mine' ? (
        <div className="cols" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <section className="glass panel"><h2 className="h2" style={{ fontSize: 22, marginBottom: 16 }}>In progress ({active.length})</h2>{active.length ? active.map((r) => <SessionCard key={r.id} role={role} r={r} onDone={done} />) : <Empty icon="event_available">No active sessions. Accept a request to get started.</Empty>}</section>
          <section className="glass panel"><h2 className="h2" style={{ fontSize: 22, marginBottom: 16 }}>Completed ({history.length})</h2>{history.length ? history.map((r) => <SessionCard key={r.id} role={role} r={r} onDone={done} />) : <Empty icon="task_alt">Completed sessions will appear here.</Empty>}</section>
        </div>
      ) : incoming.length === 0 ? (
        <div className="glass panel"><Empty icon="inbox">{data.incoming.length ? 'No requests match your filter.' : "You're all caught up — no pending requests."}</Empty></div>
      ) : isAlumni ? (
        <div className="split">
          <div><div className="eyebrow" style={{ margin: '0 6px 12px' }}>Dossier queue · newest first</div>
            {incoming.map((r) => (
              <button key={r.id} className={`qitem ${selected && selected.id === r.id ? 'on' : ''}`} onClick={() => setSel(r.id)}>
                <div className="row between" style={{ flexWrap: 'nowrap' }}><b>{r.name}</b><span className="xs muted">{ago(r.createdAt)}</span></div>
                <div className="xs muted" style={{ margin: '2px 0 6px' }}>{r.branch} · {r.year}</div>
                <div className="small" style={{ color: 'var(--ink-2)' }}>{r.topic}</div>
                <div className="row" style={{ marginTop: 8 }}><span className="pill"><Icon n={TYPE_ICON[r.type]} className="" style={{ fontSize: 14 }} />{r.typeLabel}</span></div>
              </button>))}</div>
          {selected && <Detail r={selected} />}
        </div>
      ) : (
        <div className="cols">
          <div>{incoming.map((r) => (
            <article key={r.id} className="glass lift mentor" style={{ padding: 28 }}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar name={r.name} soft /><div><b>{r.name}</b><div className="xs muted">{r.branch} · {r.year}</div></div></div>
                <div className="row"><span className="pill dark">{r.batchStatus} batch</span><span className="xs muted">{ago(r.createdAt)}</span></div></div>
              <h3 className="h3" style={{ fontSize: 20, margin: '16px 0 6px' }}>{r.topic}</h3>
              {r.details && <p style={{ color: 'var(--ink-2)', marginBottom: 14 }}>{r.details}</p>}
              <Actions role={role} r={r} onDone={done} />
            </article>))}</div>
          <aside className="stack">
            <section className="glass panel"><h2 className="h2" style={{ fontSize: 22, marginBottom: 14 }}>Connected students</h2>
              {active.length ? active.map((r) => <SessionCard key={r.id} role={role} r={r} onDone={done} />) : <Empty icon="groups">Accepted queries appear here.</Empty>}</section>
            <section className="glass panel"><h2 className="h2" style={{ fontSize: 22, marginBottom: 14 }}>Batch demand</h2>
              {['running', 'upcoming'].map((b) => { const n = data.incoming.filter((r) => r.batchStatus === b).length; return (
                <div key={b} style={{ marginBottom: 12 }}><div className="row between small"><b style={{ textTransform: 'capitalize' }}>{b} batches</b><span>{n} pending</span></div>
                  <div style={{ height: 8, borderRadius: 9, background: 'rgba(15,23,42,.08)', marginTop: 6 }}><div style={{ width: `${Math.min(100, n * 25)}%`, height: '100%', borderRadius: 9, background: 'var(--ink)' }} /></div></div>); })}</section>
          </aside>
        </div>
      )}
    </>
  );
}
