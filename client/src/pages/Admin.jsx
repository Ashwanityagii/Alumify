import { useState } from 'react';
import { api } from '../api.js';
import { Badge, Empty, Icon, Loading, PageHead, ago, fmtDate, matches, useLoad, useToast } from '../ui.jsx';

const Tile = ({ label, value, icon }) => <div className="glass stat"><div className="row between"><span className="eyebrow">{label}</span><Icon n={icon} className="" /></div><b>{value}</b></div>;

export function AdminOverview() {
  const { data, error, reload } = useLoad('/admin/overview'); const toast = useToast();
  if (error && !data) return <div className="alert err">{error}</div>;
  if (!data) return <Loading />;
  const approve = async (u) => { try { await api(`/admin/users/${u.id}/approve`, { method: 'POST' }); toast(`${u.name} approved. They can now log in.`); reload(); } catch (e) { toast(e.message, true); } };
  const reject = async (u) => {
    if (!window.confirm(`Reject ${u.name}? They will not be able to sign in.`)) return;
    try { await api(`/admin/users/${u.id}/disable`, { method: 'POST' }); toast(`${u.name} rejected`); reload(); } catch (e) { toast(e.message, true); }
  };
  return (
    <>
      <PageHead eyebrow={`Admin Console · data: ${data.mode}`} title="Platform" em="overview">Verify alumni and faculty, manage accounts and watch mentorship activity.</PageHead>
      <div className="stats" style={{ marginBottom: 28 }}>
        <Tile label="Students" value={data.users.students} icon="school" /><Tile label="Alumni" value={data.users.alumni} icon="workspace_premium" /><Tile label="Faculty" value={data.users.faculty} icon="menu_book" />
        <Tile label="Requests" value={data.requests.total} icon="forum" /><Tile label="Active" value={data.requests.active} icon="event_available" /><Tile label="Sessions done" value={data.requests.completed} icon="task_alt" />
      </div>
      <section className="glass panel"><h2 className="h2" style={{ fontSize: 24, marginBottom: 6 }}>Pending verification ({data.pendingUsers.length})</h2>
        <p className="small muted" style={{ marginBottom: 16 }}>Approve an alumni or faculty signup and they can sign in right away.</p>
        {data.pendingUsers.length === 0 ? <Empty icon="verified">No accounts waiting for approval.</Empty> : data.pendingUsers.map((u) => (
          <div key={u.id} className="reqitem row between" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div><b>{u.name}</b> <span className="pill" style={{ marginLeft: 6 }}>{u.role}</span>
              <div className="small muted">{u.email}{u.headline ? ` · ${u.headline}` : ''}</div>
              <div className="xs muted">{u.branch}{u.gradYear ? ` · Class of ${u.gradYear}` : ''}{u.tags && u.tags.length ? ` · ${u.tags.join(', ')}` : ''}</div></div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn sm danger" onClick={() => reject(u)}><Icon n="close" />Reject</button>
              <button className="btn primary sm" onClick={() => approve(u)}><Icon n="check" />Approve</button></div></div>))}</section>
    </>
  );
}

export function AdminUsers() {
  const { data, error, reload } = useLoad('/admin/users'); const toast = useToast(); const [open, setOpen] = useState(false); const [qq, setQq] = useState('');
  const [f, setF] = useState({ role: 'student', name: '', email: '', password: '', branch: '', year: '1st Year', gradYear: '', headline: '' }); const [err, setErr] = useState('');
  if (error && !data) return <div className="alert err">{error}</div>;
  if (!data) return <Loading />;
  const act = async (u, a) => { try { await api(`/admin/users/${u.id}/${a}`, { method: 'POST' }); toast(`${u.name}: ${a}d`); reload(); } catch (e) { toast(e.message, true); } };
  const create = async (e) => { e.preventDefault(); setErr(''); try { await api('/admin/users', { method: 'POST', body: f }); toast('User created'); setOpen(false); reload(); } catch (x) { setErr(x.message); } };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <PageHead eyebrow="Admin Console" title="User" em="management" right={<button className="btn primary xl" onClick={() => setOpen(!open)}><Icon n={open ? 'close' : 'person_add'} />{open ? 'Close' : 'Add user'}</button>}>Approve, disable or create accounts.</PageHead>
      {open && (
        <form className="glass panel stack" onSubmit={create} style={{ marginBottom: 24, maxWidth: 820 }}>
          {err && <div className="alert err">{err}</div>}
          <div className="grid2">
            <label className="f"><span>Role</span><select value={f.role} onChange={set('role')}>{['student', 'alumni', 'faculty', 'admin'].map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className="f"><span>Name</span><input required value={f.name} onChange={set('name')} /></label>
            <label className="f"><span>Email</span><input type="email" required value={f.email} onChange={set('email')} /></label>
            <label className="f"><span>Temporary password (10+)</span><input type="text" required minLength={10} value={f.password} onChange={set('password')} /></label>
            {f.role !== 'admin' && <label className="f"><span>Branch / department</span><input required value={f.branch} onChange={set('branch')} /></label>}
            {f.role === 'student' && <label className="f"><span>Year</span><select value={f.year} onChange={set('year')}>{['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year / Dual Degree', 'Postgraduate'].map((y) => <option key={y}>{y}</option>)}</select></label>}
            {f.role === 'alumni' && <label className="f"><span>Graduation year</span><input type="number" required value={f.gradYear} onChange={set('gradYear')} /></label>}
            {['alumni', 'faculty'].includes(f.role) && <label className="f"><span>Headline</span><input required value={f.headline} onChange={set('headline')} /></label>}
          </div><div><button className="btn primary">Create account</button></div></form>)}
      <section className="glass panel"><div className="row between" style={{ marginBottom: 12 }}><h2 className="h2" style={{ fontSize: 22 }}>All users ({data.users.length})</h2>
        <input style={{ maxWidth: 280, height: 40 }} placeholder="Filter users…" value={qq} onChange={(e) => setQq(e.target.value)} /></div>
        <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Role</th><th>Details</th><th>Status</th><th /></tr></thead><tbody>
          {data.users.filter((u) => matches(qq, u.name, u.email, u.role, u.branch)).map((u) => (
            <tr key={u.id}><td><b>{u.name}</b><div className="xs muted">{u.email}</div></td><td><span className="pill">{u.role}</span></td><td className="small muted">{u.branch}{u.year ? ` · ${u.year}` : ''}{u.gradYear ? ` · '${String(u.gradYear).slice(2)}` : ''}</td>
              <td><Badge s={u.status} /></td>
              <td style={{ textAlign: 'right' }}>{u.status === 'pending' && <button className="btn sm primary" onClick={() => act(u, 'approve')}>Approve</button>}
                {u.status === 'active' && u.role !== 'admin' && <button className="btn sm danger" onClick={() => window.confirm(`Disable ${u.name}? They will be signed out immediately.`) && act(u, 'disable')}>Disable</button>}
                {u.status === 'disabled' && <button className="btn sm" onClick={() => act(u, 'enable')}>Enable</button>}</td></tr>))}
        </tbody></table></div></section>
    </>
  );
}

export function AdminRequests() {
  const { data, error } = useLoad('/admin/requests'); const [qq, setQq] = useState('');
  if (error && !data) return <div className="alert err">{error}</div>;
  if (!data) return <Loading />;
  return (
    <>
      <PageHead eyebrow="Admin Console" title="All" em="requests">Every mentorship request across the platform.</PageHead>
      <section className="glass panel"><div className="row between" style={{ marginBottom: 12 }}><h2 className="h2" style={{ fontSize: 22 }}>{data.requests.length} requests</h2>
        <input style={{ maxWidth: 280, height: 40 }} placeholder="Filter…" value={qq} onChange={(e) => setQq(e.target.value)} /></div>
        <div className="table-wrap"><table className="table"><thead><tr><th>Student</th><th>Type</th><th>Topic</th><th>Mentor</th><th>Status</th><th>When</th></tr></thead><tbody>
          {data.requests.filter((r) => matches(qq, r.name, r.topic, r.mentorName, r.status, r.typeLabel)).map((r) => (
            <tr key={r.id}><td><b>{r.name}</b><div className="xs muted">{r.branch} · {r.year}</div></td><td className="small">{r.typeLabel}{r.batchStatus ? ` (${r.batchStatus})` : ''}</td><td className="small" style={{ maxWidth: 280 }}>{r.topic}</td>
              <td className="small">{r.mentorName || <span className="muted">—</span>}</td><td><Badge s={r.status} /></td><td className="xs muted">{r.scheduledAt ? fmtDate(r.scheduledAt) : ago(r.createdAt)}</td></tr>))}
        </tbody></table></div></section>
    </>
  );
}
