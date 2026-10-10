import { useEffect, useState } from 'react';
import api from '../services/api';
import TicketCard from '../components/TicketCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import Pagination from '../components/Pagination';

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const [ticketResponse, userResponse] = await Promise.all([
        api.get('/api/tickets', { params: { page, limit: 20 } }),
        api.get('/api/admin/users')
      ]);
      setTickets(ticketResponse.data.data || []);
      setPagination(ticketResponse.data.pagination || { page: 1, totalPages: 1 });
      setAgents((userResponse.data.users || []).filter((user) => user.role === 'AGENT' && user.is_active));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load admin ticket data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page]);

  const assign = async (ticketId, assignedAgentId) => {
    try {
      const response = await api.patch(`/api/tickets/${ticketId}/assign`, {
        assignedAgentId: assignedAgentId ? Number(assignedAgentId) : null
      });
      setTickets((current) => current.map((ticket) => ticket.id === ticketId ? response.data.ticket : ticket));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update ticket assignment.');
    }
  };

  const autoAssign = async (ticketId) => {
    try {
      const response = await api.post(`/api/tickets/${ticketId}/auto-assign`);
      setTickets((current) => current.map((ticket) => ticket.id === ticketId ? response.data.ticket : ticket));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to auto-assign ticket.');
    }
  };

  if (loading) return <LoadingState message="Loading admin tickets..." />;

  return (
    <div className="container page-shell">
      <div className="page-header">
        <h1>All tickets</h1>
      </div>
      {error && <ErrorState message={error} />}
      <div className="ticket-list">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="admin-ticket-row">
            <TicketCard ticket={ticket} />
            <div className="assignment-controls">
              <label>
                Assign agent
                <select
                  value={ticket.assigned_agent_id || ''}
                  onChange={(event) => assign(ticket.id, event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </label>
              <button className="secondary-btn" onClick={() => autoAssign(ticket.id)}>Auto-assign least-loaded</button>
            </div>
          </div>
        ))}
        {!tickets.length && <div className="state-box">No tickets found.</div>}
      </div>
      <Pagination page={pagination.page} totalPages={pagination.totalPages || 1} onPageChange={setPage} />
    </div>
  );
}
