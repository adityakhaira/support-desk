ALTER TABLE ticket_history
  ADD CONSTRAINT fk_history_old_agent FOREIGN KEY (old_assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE ticket_history
  ADD CONSTRAINT fk_history_new_agent FOREIGN KEY (new_assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE sla_rules
  ADD CONSTRAINT chk_sla_hours_positive CHECK (response_hours > 0 AND resolution_hours > 0);

CREATE INDEX idx_tickets_status_sla_deadline ON tickets(status, sla_deadline);
