import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = {
  CUSTOMER: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/tickets', label: 'Tickets' },
    { to: '/my-tickets', label: 'My Tickets' },
    { to: '/tickets/new', label: 'New Ticket' }
  ],
  AGENT: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/tickets', label: 'Assigned Tickets' },
    { to: '/my-tickets', label: 'My Tickets' }
  ],
  ADMIN: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/admin', label: 'Admin' },
    { to: '/admin/tickets', label: 'All Tickets' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/categories', label: 'Categories' }
  ]
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <header className="topbar">
        <div className="container nav-wrap">
          <Link to="/login" className="brand">SupportDesk</Link>
          <nav className="nav-links">
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="topbar">
      <div className="container nav-wrap">
        <Link to="/dashboard" className="brand">SupportDesk</Link>
        <nav className="nav-links">
          {navItems[user.role]?.map((item) => (
            <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
          ))}
          <NavLink to="/profile">Profile</NavLink>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </nav>
      </div>
    </header>
  );
}
