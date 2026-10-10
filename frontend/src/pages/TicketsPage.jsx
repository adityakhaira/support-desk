import { useEffect, useState } from 'react';
import api from '../services/api';
import TicketCard from '../components/TicketCard';
import Pagination from '../components/Pagination';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/tickets', {
          params: {
            page,
            limit,
            status: filters.status || undefined,
            priority: filters.priority || undefined,
            search: filters.search || undefined
          }
        });
        setTickets(response.data.data || []);
        setPagination(response.data.pagination || { page: 1, totalPages: 1, total: 0 });
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load tickets.');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [page, limit, filters.status, filters.priority, filters.search]);

  if (loading) return <LoadingState message="Loading tickets..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="container page-shell">
      <div className="page-header">
        <h1>Tickets</h1>
      </div>

      <div className="filter-bar card-box">
        <input
          placeholder="Search by title, description or customer"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="WAITING_FOR_CUSTOMER">Waiting for customer</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
        </select>
      </div>

      <div className="ticket-list">
        {tickets.length ? tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />) : <div className="state-box">No tickets found.</div>}
      </div>

      <Pagination page={pagination.page} totalPages={pagination.totalPages || 1} onPageChange={setPage} />
    </div>
  );
}
