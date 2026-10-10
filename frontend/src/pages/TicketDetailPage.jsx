import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { useAuth } from '../context/AuthContext';

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [history, setHistory] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTicket = async () => {
    try {
      const response = await api.get(`/api/tickets/${id}`);
      setTicket(response.data.ticket);
      setHistory(response.data.history || []);
      const commentResponse = await api.get(`/api/tickets/${id}/comments`);
      setComments(commentResponse.data.comments || []);
      setStatus(response.data.ticket.status);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load ticket.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!status) return;
    try {
      await api.patch(`/api/tickets/${id}/status`, { status });
      fetchTicket();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update status.');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/tickets/${id}/comments`, { comment: commentText });
      setCommentText('');
      fetchTicket();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to post comment.');
    }
  };

  if (loading) return <LoadingState message="Loading ticket details..." />;
  if (error) return <ErrorState message={error} />;
  if (!ticket) return <ErrorState message="Ticket not found." />;

  const isAdmin = user?.role === 'ADMIN';
  const isAgent = user?.role === 'AGENT';

  return (
    <div className="container page-shell">
      <div className="page-header">
        <div>
          <h1>{ticket.title}</h1>
          <p>Ticket #{ticket.id}</p>
        </div>
        <div className="header-badges">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <div className="detail-grid">
        <div className="card-box">
          <h3>Ticket overview</h3>
          <p>{ticket.description}</p>
          <ul className="detail-list">
            <li><strong>Customer:</strong> {ticket.customer_name}</li>
            <li><strong>Assigned agent:</strong> {ticket.agent_name || 'Unassigned'}</li>
            <li><strong>Category:</strong> {ticket.category_name}</li>
            <li><strong>First-response SLA deadline:</strong> {ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleString() : 'N/A'}</li>
          </ul>
        </div>

        {(isAdmin || isAgent) && (
          <div className="card-box">
            <h3>Update status</h3>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="WAITING_FOR_CUSTOMER">Waiting for customer</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <button className="primary-btn" onClick={handleStatusUpdate}>Apply status</button>
          </div>
        )}
      </div>

      <div className="two-column-grid">
        <div className="card-box">
          <h3>Comments</h3>
          <div className="comment-list">
            {comments.length ? comments.map((entry) => (
              <div key={entry.id} className="comment-item">
                <strong>{entry.user_name}</strong>
                <small>{new Date(entry.created_at).toLocaleString()}</small>
                <p>{entry.comment}</p>
              </div>
            )) : <p>No comments yet.</p>}
          </div>

          <form onSubmit={handleComment} className="comment-form">
            <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} required placeholder="Add a comment..." />
            <button type="submit" className="primary-btn">Post comment</button>
          </form>
        </div>

        <div className="card-box">
          <h3>History</h3>
          <div className="history-list">
            {history.map((entry) => (
              <div key={entry.id} className="history-item">
                <strong>{entry.action}</strong>
                <p>{entry.description}</p>
                <small>{new Date(entry.created_at).toLocaleString()}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
