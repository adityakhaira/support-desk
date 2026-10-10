import { useEffect, useState } from 'react';
import api from '../services/api';
import TicketCard from '../components/TicketCard';
import Pagination from '../components/Pagination';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    const fetchMyTickets = async () => {
      try {
        const response = await api.get('/api/tickets', { params: { page, limit: 10 } });
        setTickets(response.data.data || []);
        setPagination(response.data.pagination || { page: 1, totalPages: 1, total: 0 });
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load tickets.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyTickets();
  }, [page]);

  if (loading) return <LoadingState message="Loading your tickets..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="container page-shell">
      <div className="page-header">
        <h1>My tickets</h1>
      </div>
      <div className="ticket-list">
        {tickets.length ? tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />) : <div className="state-box">No tickets yet.</div>}
      </div>
      <Pagination page={pagination.page} totalPages={pagination.totalPages || 1} onPageChange={setPage} />
    </div>
  );
}
