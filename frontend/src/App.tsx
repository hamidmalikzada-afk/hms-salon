import { useState } from 'react';
import {
  BrowserRouter as Router,
  NavLink,
  Route,
  Routes,
} from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import {
  canViewReports,
  clearAuth,
  getStoredAuth,
  hasRole,
  roleLabel,
  saveAuth,
} from './lib/auth';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Services from './pages/Services';
import Customers from './pages/Customers';
import Tokens from './pages/Tokens';
import Appointments from './pages/Appointments';
import Invoices from './pages/Invoices';
import Login from './pages/Login';
import Register from './pages/Register';
import InvoicePrint from './pages/InvoicePrint';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Staff from './pages/Staff';
import Expenses from './pages/Expenses';
import Commissions from './pages/Commissions';
import './App.css';

interface NavItem {
  to: string;
  label: string;
  description: string;
  exact?: boolean;
  visible: (user?: any, isAuthenticated?: boolean) => boolean;
}

const navigation: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    description: 'Live overview',
    exact: true,
    visible: () => true,
  },
  {
    to: '/branches',
    label: 'Branches',
    description: 'Locations',
    visible: () => true,
  },
  {
    to: '/services',
    label: 'Services',
    description: 'Menu and pricing',
    visible: () => true,
  },
  {
    to: '/customers',
    label: 'Customers',
    description: 'CRM and loyalty',
    visible: () => true,
  },
  {
    to: '/staff',
    label: 'Staff',
    description: 'Team and shifts',
    visible: () => true,
  },
  {
    to: '/expenses',
    label: 'Expenses',
    description: 'Cash outflows',
    visible: () => true,
  },
  {
    to: '/commissions',
    label: 'Commissions',
    description: 'Payout tracking',
    visible: (user) => hasRole(user, ['super_admin', 'manager']),
  },
  {
    to: '/tokens',
    label: 'Queue Tokens',
    description: 'Walk-in flow',
    visible: () => true,
  },
  {
    to: '/appointments',
    label: 'Appointments',
    description: 'Bookings',
    visible: () => true,
  },
  {
    to: '/invoices',
    label: 'Invoices',
    description: 'Billing',
    visible: () => true,
  },
  {
    to: '/reports',
    label: 'Reports',
    description: 'Performance',
    visible: (user) => canViewReports(user),
  },
  {
    to: '/users',
    label: 'Users & Access',
    description: 'Permissions',
    visible: (user) => hasRole(user, ['super_admin', 'manager']),
  },
];

function App(): JSX.Element {
  const [auth, setAuth] = useState(getStoredAuth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAuthenticated = Boolean(auth?.token && auth?.user);
  const navigationItems = navigation.filter((item) =>
    item.visible ? item.visible(auth?.user, isAuthenticated) : isAuthenticated
  );

  const handleAuthChange = (nextAuth: any) => {
    setAuth(nextAuth);
    if (nextAuth?.token && nextAuth?.user) {
      saveAuth(nextAuth);
    } else {
      clearAuth();
    }
  };

  const handleLogout = () => {
    setIsSidebarOpen(false);
    handleAuthChange({ token: '', user: null });
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={<Login onAuthChange={handleAuthChange} />}
        />
        <Route
          path="/register"
          element={<Register auth={auth} onAuthChange={handleAuthChange} />}
        />

        <Route
          path="*"
          element={
            <ProtectedRoute auth={auth}>
              <div className="app-shell">
                <button
                  type="button"
                  className={`sidebar-overlay${isSidebarOpen ? ' visible' : ''}`}
                  aria-label="Close navigation"
                  onClick={() => setIsSidebarOpen(false)}
                />

                <aside className={`sidebar${isSidebarOpen ? ' open' : ''}`}>
                  <div className="brand-panel">
                    <div className="brand-mark">HMS</div>
                    <div>
                      <p className="brand-kicker">Hamid Malikzada Software</p>
                      <h2>Salon OS</h2>
                    </div>
                    <p className="brand-copy">
                      Manage customers, bookings, billing, and the live service
                      queue from one workspace.
                    </p>
                  </div>

                  <div className="sidebar-section-label">Navigation</div>
                  <nav className="sidebar-nav">
                    {navigationItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.exact}
                        onClick={() => setIsSidebarOpen(false)}
                        className={({ isActive }) =>
                          `nav-link${isActive ? ' active' : ''}`
                        }
                      >
                        <span>{item.label}</span>
                        <small>{item.description}</small>
                      </NavLink>
                    ))}
                  </nav>

                  <div className="sidebar-user">
                    <p className="sidebar-user-name">
                      {auth.user?.full_name}
                    </p>
                    <p className="sidebar-user-role">
                      {roleLabel(auth.user?.role)}
                    </p>
                    <button
                      className="button secondary"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>

                  <div className="sidebar-footer">
                    <span className="status-dot" />
                    System ready for daily salon operations
                  </div>
                </aside>

                <main className="app-main">
                  <div className="mobile-topbar">
                    <button
                      type="button"
                      className="button secondary nav-toggle"
                      onClick={() => setIsSidebarOpen((current) => !current)}
                    >
                      Menu
                    </button>

                    <div className="mobile-profile">
                      <strong>{auth.user?.full_name}</strong>
                      <span>{roleLabel(auth.user?.role)}</span>
                    </div>
                  </div>

                  <Routes>
                    <Route path="/" element={<Dashboard auth={auth} />} />
                    <Route path="/branches" element={<Branches auth={auth} />} />
                    <Route path="/services" element={<Services auth={auth} />} />
                    <Route
                      path="/customers"
                      element={<Customers auth={auth} />}
                    />
                    <Route path="/staff" element={<Staff auth={auth} />} />
                    <Route
                      path="/expenses"
                      element={<Expenses auth={auth} />}
                    />
                    <Route
                      path="/commissions"
                      element={<Commissions auth={auth} />}
                    />
                    <Route path="/tokens" element={<Tokens auth={auth} />} />
                    <Route
                      path="/appointments"
                      element={<Appointments auth={auth} />}
                    />
                    <Route
                      path="/invoices"
                      element={<Invoices auth={auth} />}
                    />
                    <Route path="/reports" element={<Reports auth={auth} />} />
                    <Route path="/users" element={<Users auth={auth} />} />
                    <Route
                      path="/invoices/:id/print"
                      element={<InvoicePrint auth={auth} />}
                    />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
