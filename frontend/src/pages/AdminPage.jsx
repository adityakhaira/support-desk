import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import TicketCard from '../components/TicketCard';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [sla, setSla] = useState(null);
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, slaResponse, workloadResponse] = await Promise.all([
          api.get('/api/admin/statistics'),
          api.get('/api/admin/sla-breaches'),
          api.get('/api/admin/agent-workload')
        ]);
        setStats(statsResponse.data);
        setSla(slaResponse.data);
        setWorkload(workloadResponse.data.workload || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load admin dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading admin dashboard..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="container page-shell">
      <div className="page-header">
        <h1>Admin dashboard</h1>
        <Link to="/admin/tickets" className="primary-btn">Manage assignments</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>Total tickets</span><strong>{stats?.total_tickets || 0}</strong></div>
        <div className="stat-card"><span>Open</span><strong>{stats?.open_tickets || 0}</strong></div>
        <div className="stat-card"><span>In progress</span><strong>{stats?.in_progress_tickets || 0}</strong></div>
        <div className="stat-card"><span>Resolved</span><strong>{stats?.resolved_tickets || 0}</strong></div>
        <div className="stat-card"><span>Closed</span><strong>{stats?.closed_tickets || 0}</strong></div>
        <div className="stat-card"><span>High/Critical</span><strong>{stats?.high_critical_tickets || 0}</strong></div>
        <div className="stat-card"><span>SLA breaches</span><strong>{sla?.summary?.breach_count || 0}</strong></div>
        <div className="stat-card"><span>Unresolved first-response breach rate</span><strong>{sla?.summary?.breach_rate || 0}%</strong></div>
      </div>

      <section className="section-block">
        <div className="section-title-row">
          <h2>SLA breaches by priority</h2>
          <Link to="/admin/tickets">Review tickets</Link>
        </div>
        <div className="stats-grid">
          <div className="stat-card"><span>Critical</span><strong>{sla?.summary?.critical_breaches || 0}</strong></div>
          <div className="stat-card"><span>High</span><strong>{sla?.summary?.high_breaches || 0}</strong></div>
          <div className="stat-card"><span>Medium</span><strong>{sla?.summary?.medium_breaches || 0}</strong></div>
          <div className="stat-card"><span>Low</span><strong>{sla?.summary?.low_breaches || 0}</strong></div>
        </div>
        <div className="table-box">
          <table>
            <thead><tr><th>Ticket</th><th>Priority</th><th>Customer</th><th>Agent</th><th>Deadline</th></tr></thead>
            <tbody>
              {(sla?.breaches || []).map((ticket) => (
                <tr key={ticket.id}>
                  <td><Link to={`/tickets/${ticket.id}`}>#{ticket.id} {ticket.title}</Link></td>
                  <td>{ticket.priority}</td>
                  <td>{ticket.customer_name}</td>
                  <td>{ticket.agent_name || 'Unassigned'}</td>
                  <td>{new Date(ticket.sla_deadline).toLocaleString()}</td>
                </tr>
              ))}
              {!sla?.breaches?.length && <tr><td colSpan="5">No unresolved SLA breaches.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-block">
        <h2>Agent workload</h2>
        <div className="table-box">
          <table>
            <thead><tr><th>Agent</th><th>Unresolved</th><th>Critical</th><th>High</th></tr></thead>
            <tbody>
              {workload.map((agent) => (
                <tr key={agent.id}>
                  <td>{agent.name}</td>
                  <td>{agent.unresolved_tickets}</td>
                  <td>{agent.critical_tickets}</td>
                  <td>{agent.high_tickets}</td>
                </tr>
              ))}
              {!workload.length && <tr><td colSpan="4">No active agents.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-block">
        <h2>Recent tickets</h2>
        <div className="ticket-list">
          {(stats?.recentTickets || []).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
        </div>
      </section>
    </div>
  );
}
