import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Empty, Icon, Loading, PageHead, matches, useLoad, useSearch, useToast } from '../ui.jsx';
import { ReqItem } from './StudentDashboard.jsx';

export default function StudentRequests() {
  const { data, error, reload } = useLoad('/student/overview'); const toast = useToast(); const q = useSearch();
  if (error && !data) return <div className="alert err">{error}</div>;
  if (!data) return <Loading />;
  const cancel = async (r) => { if (!window.confirm('Cancel this request?')) return; try { await api(`/student/requests/${r.id}/cancel`, { method: 'POST' }); toast('Request cancelled'); reload(); } catch (e) { toast(e.message, true); } };
  const list = data.requests.filter((r) => matches(q, r.topic, r.typeLabel, r.mentorName, r.status));
  const groups = [['Active', list.filter((r) => ['pending', 'accepted', 'scheduled'].includes(r.status))], ['History', list.filter((r) => ['completed', 'declined', 'cancelled'].includes(r.status))]];
  return (
    <>
      <PageHead eyebrow="Student Portal" title="My" em="Requests" right={<Link to="/student/new" className="btn primary xl"><Icon n="add" />Create New Request</Link>}>Everything you've asked for, and where each request stands.</PageHead>
      <div className="cols" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {groups.map(([title, items]) => (
          <section key={title} className="glass panel"><h2 className="h2" style={{ fontSize: 22, marginBottom: 16 }}>{title} <span className="muted" style={{ fontSize: 16 }}>({items.length})</span></h2>
            {items.length === 0 ? <Empty icon="inbox">Nothing here yet.</Empty> : items.map((r) => <ReqItem key={r.id} r={r} onCancel={cancel} />)}</section>))}
      </div>
    </>
  );
}
