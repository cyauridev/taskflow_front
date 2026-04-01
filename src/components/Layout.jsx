import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>TaskFlow Pro</h2>
        <p className="muted">{user?.nombre}</p>
        <p className="badge">{user?.role}</p>

        <nav>
          <Link className={location.pathname === '/dashboard' ? 'active' : ''} to="/dashboard">Dashboard</Link>
          <Link className={location.pathname === '/projects' ? 'active' : ''} to="/projects">Projects</Link>
          <Link className={location.pathname === '/tasks' ? 'active' : ''} to="/tasks">Tasks</Link>
          {user?.role === 'ADMIN' && (
            <Link className={location.pathname === '/users' ? 'active' : ''} to="/users">Users</Link>
          )}
        </nav>

        <button onClick={logout}>Cerrar sesión</button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
