import { Navigate, Route, Routes } from 'react-router-dom';
import { homeFor, useAuth } from './auth.jsx';
import { Background, Loading, Shell } from './ui.jsx';
import { AdminLogin, AdminRegister, Login, Register } from './pages/Auth.jsx';
import Landing from './pages/Landing.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import NewRequest from './pages/NewRequest.jsx';
import StudentRequests from './pages/StudentRequests.jsx';
import MentorPortal from './pages/MentorPortal.jsx';
import { AdminOverview, AdminRequests, AdminUsers } from './pages/Admin.jsx';

function NotFound() {
  return (<><Background /><div className="page-bare"><div className="glass authcard" style={{ textAlign: 'center' }}>
    <h1 className="h1">404</h1><p className="lead" style={{ margin: '10px auto 22px' }}>This page doesn't exist.</p><a className="btn primary" href="/">Go home</a></div></div></>);
}

// UX guard only: the API enforces the same role rules independently on every request.
function Guard({ role, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <><Background /><Loading /></>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return role === 'admin' ? <NotFound /> : <Navigate to={homeFor(user.role)} replace />;
  return <Shell searchable={role !== 'admin'}>{children}</Shell>;
}
function Public({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <><Background /><Loading /></>;
  return user ? <Navigate to={homeFor(user.role)} replace /> : children;
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Public><Login /></Public>} />
      <Route path="/register" element={<Public><Register /></Public>} />
      <Route path="/admin/register" element={<Public><AdminRegister /></Public>} />
      <Route path="/admin/login" element={<Public><AdminLogin /></Public>} />
      <Route path="/student" element={<Guard role="student"><StudentDashboard /></Guard>} />
      <Route path="/student/new" element={<Guard role="student"><NewRequest /></Guard>} />
      <Route path="/student/requests" element={<Guard role="student"><StudentRequests /></Guard>} />
      <Route path="/alumni" element={<Guard role="alumni"><MentorPortal role="alumni" /></Guard>} />
      <Route path="/faculty" element={<Guard role="faculty"><MentorPortal role="faculty" /></Guard>} />
      <Route path="/admin" element={<Guard role="admin"><AdminOverview /></Guard>} />
      <Route path="/admin/users" element={<Guard role="admin"><AdminUsers /></Guard>} />
      <Route path="/admin/requests" element={<Guard role="admin"><AdminRequests /></Guard>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
