export default function StatusBadge({ status }) {
  const palette = {
    OPEN: 'status-open',
    IN_PROGRESS: 'status-progress',
    WAITING_FOR_CUSTOMER: 'status-waiting',
    RESOLVED: 'status-resolved',
    CLOSED: 'status-closed'
  };

  return <span className={`badge ${palette[status] || 'status-default'}`}>{status?.replace('_', ' ')}</span>;
}
