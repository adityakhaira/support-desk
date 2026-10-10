import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';

export default function TicketCard({ ticket }) {
  return (
    <div className="ticket-card">
      <div className="ticket-header-row">
        <div>
          <h3>{ticket.title}</h3>
          <p>#{ticket.id} • {ticket.category_name || 'Category'}</p>
        </div>
        <div className="ticket-header-badges">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>
      <p className="ticket-description">{ticket.description}</p>
      <div className="ticket-meta">
        <span>Customer: {ticket.customer_name || 'N/A'}</span>
        <span>Agent: {ticket.agent_name || 'Unassigned'}</span>
      </div>
      <Link className="primary-link" to={`/tickets/${ticket.id}`}>View details</Link>
    </div>
  );
}
