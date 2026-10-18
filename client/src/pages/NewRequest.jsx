import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Icon, Loading, PageHead, useLoad, useToast } from '../ui.jsx';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year / Dual Degree', 'Postgraduate'];
const TYPES = [
  { k: 'coffee', icon: 'coffee', title: 'Coffee Talk', sub: '15 minutes · casual chat' },
  { k: 'resume', icon: 'description', title: 'Resume Review', sub: '30 minutes · line-by-line' },
  { k: 'guidance', icon: 'explore', title: 'Guidance', sub: '30 minutes · career & path' },
];

export default function NewRequest() {
  const { user } = useAuth(); const nav = useNavigate(); const toast = useToast();
  const [params] = useSearchParams(); const to = params.get('to');
  const { data } = useLoad('/student/overview');
  const target = data && to ? data.directory.find((m) => m.id === to) : null;
  const [f, setF] = useState({ name: user.name, branch: user.branch || '', year: user.year || '3rd Year', audience: 'alumni', type: 'coffee', batchStatus: 'upcoming', topic: '', details: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { if (target) setF((s) => ({ ...s, audience: target.role })); }, [target]);
  if (!data) return <Loading />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const slotsLeft = data.maxOpen - data.open;
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api('/student/requests', { method: 'POST', body: { ...f, targetId: target ? target.id : undefined } }); toast('Request sent — you will see its status on your dashboard'); nav('/student'); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <>
      <PageHead eyebrow="New request" title="Create a" em="request">Tell us who you are and what you need. {target ? '' : 'Any matching mentor can pick it up.'}</PageHead>
      <form className="glass panel stack" onSubmit={submit} style={{ maxWidth: 860, gap: 22, padding: 34 }}>
        {target && <div className="note"><Icon n="person" className="" /><span>Requesting <b>{target.name}</b> ({target.headline}). Only they will see this request. <Link to="/student/new" style={{ textDecoration: 'underline' }}>Make it open instead</Link></span></div>}
        {slotsLeft <= 0 && <div className="alert err">You have reached the limit of {data.maxOpen} open requests. Cancel one or wait for a session to complete.</div>}
        {err && <div className="alert err" role="alert">{err}</div>}
        {!target && (<div><div className="eyebrow" style={{ marginBottom: 8 }}>Who do you want to connect with?</div>
          <div className="seg"><button type="button" className={f.audience === 'alumni' ? 'on' : ''} onClick={() => setF({ ...f, audience: 'alumni' })}>Alumni mentorship</button>
            <button type="button" className={f.audience === 'faculty' ? 'on' : ''} onClick={() => setF({ ...f, audience: 'faculty' })}>Faculty · batch query</button></div></div>)}
        <div className="grid2">
          <label className="f"><span>Name</span><input required minLength={2} maxLength={80} value={f.name} onChange={set('name')} /></label>
          <label className="f"><span>Branch</span><input required minLength={2} maxLength={60} value={f.branch} onChange={set('branch')} placeholder="e.g. CSE" /></label>
        </div>
        <label className="f"><span>Year</span><select value={f.year} onChange={set('year')}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select></label>
        {f.audience === 'alumni' ? (
          <div><div className="eyebrow" style={{ marginBottom: 8 }}>Type</div>
            <div className="typegrid" role="radiogroup" aria-label="Request type">{TYPES.map((t) => (
              <button type="button" role="radio" aria-checked={f.type === t.k} key={t.k} className={`typecard ${f.type === t.k ? 'on' : ''}`} onClick={() => setF({ ...f, type: t.k })}>
                <Icon n={t.icon} /><b>{t.title}</b><small>{t.sub}</small></button>))}</div></div>
        ) : (
          <div><div className="eyebrow" style={{ marginBottom: 8 }}>Which batch is this about?</div>
            <div className="seg"><button type="button" className={f.batchStatus === 'upcoming' ? 'on' : ''} onClick={() => setF({ ...f, batchStatus: 'upcoming' })}>Upcoming batch</button>
              <button type="button" className={f.batchStatus === 'running' ? 'on' : ''} onClick={() => setF({ ...f, batchStatus: 'running' })}>Running batch</button></div></div>
        )}
        <label className="f"><span>Topic</span><input required minLength={3} maxLength={200} value={f.topic} onChange={set('topic')} placeholder={f.audience === 'alumni' ? 'e.g. Breaking into quant roles from ECE' : 'e.g. Distributed consensus: Raft & Paxos'} /></label>
        <label className="f"><span>More details (optional)</span><textarea maxLength={1000} value={f.details} onChange={set('details')} placeholder="Anything that helps them prepare…" /></label>
        <div className="row between"><Link className="btn" to="/student">Cancel</Link><button className="btn primary xl" disabled={busy || slotsLeft <= 0}>{busy ? 'Sending…' : <>Send request <Icon n="send" /></>}</button></div>
      </form>
    </>
  );
}
