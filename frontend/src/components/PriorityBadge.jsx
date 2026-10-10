export default function PriorityBadge({ priority }) {
  const palette = {
    LOW: 'priority-low',
    MEDIUM: 'priority-medium',
    HIGH: 'priority-high',
    CRITICAL: 'priority-critical'
  };

  return <span className={`badge ${palette[priority] || 'priority-default'}`}>{priority}</span>;
}
