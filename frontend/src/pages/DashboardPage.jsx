import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TicketCard from '../components/TicketCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const roleTitles = {
  CUSTOMER: 'Your support overview',
  AGENT: 'Your assigned workload',
  ADMIN: 'Support operations overview'
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const responses = await Promise.all([
          api.get('/api/dashboard'),
          user?.role === 'ADMIN' ? api.get('/api/admin/statistics') : Promise.resolve(null)
        ]);
        if (cancelled) return;
        setDashboard(responses[0].data);
        setAdminStats(responses[1]?.data || null);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Unable to load dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (user) fetchData();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} />;

  const stats = dashboard || {};
  const isCustomer = user?.role === 'CUSTOMER';
  const isAgent = user?.role === 'AGENT';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="container page-shell">
      <div className="page-header">
        <div>
          <h1>{roleTitles[user?.role] || 'Dashboard'}</h1>
          <p>Welcome back, {user?.name}.</p>
        </div>
        {isCustomer && <Link className="primary-btn" to="/tickets/new">Create ticket</Link>}
        {isAdmin && <Link className="primary-btn" to="/admin">Open admin dashboard</Link>}
        {isAgent && <Link className="primary-btn" to="/tickets">View assigned tickets</Link>}
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>{isCustomer ? 'My tickets' : isAgent ? 'Assigned tickets' : 'Total tickets'}</span><strong>{stats.total_tickets || 0}</strong></div>
        <div className="stat-card"><span>Open</span><strong>{stats.open_tickets || 0}</strong></div>
        <div className="stat-card"><span>In progress</span><strong>{stats.in_progress_tickets || 0}</strong></div>
        <div className="stat-card"><span>Waiting for customer</span><strong>{stats.waiting_for_customer_tickets || 0}</strong></div>
        <div className="stat-card"><span>Resolved</span><strong>{stats.resolved_tickets || 0}</strong></div>
        <div className="stat-card"><span>Closed</span><strong>{stats.closed_tickets || 0}</strong></div>
        {(isAgent || isAdmin) && <div className="stat-card"><span>High/Critical open</span><strong>{stats.high_critical_tickets || 0}</strong></div>}
        {(isAgent || isAdmin) && <div className="stat-card"><span>Critical open</span><strong>{stats.critical_tickets || 0}</strong></div>}
        {(isAgent || isAdmin) && <div className="stat-card"><span>Overdue SLA</span><strong>{stats.sla_breaches || 0}</strong></div>}
        {isAdmin && <div className="stat-card"><span>Customers</span><strong>{adminStats?.total_customers || 0}</strong></div>}
        {isAdmin && <div className="stat-card"><span>Agents</span><strong>{adminStats?.total_agents || 0}</strong></div>}
      </div>

      {isAgent && stats.next_sla_deadline && (
        <div className="notice-box">Next active ticket SLA deadline: {new Date(stats.next_sla_deadline).toLocaleString()}</div>
      )}

      {isAgent && (
        <div className="section-block">
          <h2>High-priority assigned tickets</h2>
          <div className="ticket-list">
            {(stats.highPriorityTickets || []).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
            {!stats.highPriorityTickets?.length && <div className="state-box">No open high-priority tickets.</div>}
          </div>
        </div>
      )}

      <div className="section-block">
        <div className="section-title-row">
          <h2>Recent tickets</h2>
          <Link to={isCustomer ? '/my-tickets' : '/tickets'}>View all</Link>
        </div>
        <div className="ticket-list">
          {(stats.recentTickets || []).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
          {!stats.recentTickets?.length && <div className="state-box">No tickets to show.</div>}
        </div>
      </div>
    </div>
  );
}
