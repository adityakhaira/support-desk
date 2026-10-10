CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('CUSTOMER','AGENT','ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  description TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name),
  KEY idx_categories_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tickets (
  id INT NOT NULL AUTO_INCREMENT,
  customer_id INT NOT NULL,
  assigned_agent_id INT DEFAULT NULL,
  category_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('OPEN','IN_PROGRESS','WAITING_FOR_CUSTOMER','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  priority ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  sla_deadline DATETIME DEFAULT NULL,
  resolved_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tickets_customer (customer_id),
  KEY idx_tickets_agent (assigned_agent_id),
  KEY idx_tickets_category (category_id),
  KEY idx_tickets_status (status),
  KEY idx_tickets_priority (priority),
  KEY idx_tickets_deadline (sla_deadline),
  CONSTRAINT fk_tickets_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_tickets_agent FOREIGN KEY (assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS comments (
  id INT NOT NULL AUTO_INCREMENT,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_ticket (ticket_id),
  KEY idx_comments_user (user_id),
  CONSTRAINT fk_comments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ticket_history (
  id INT NOT NULL AUTO_INCREMENT,
  ticket_id INT NOT NULL,
  changed_by INT DEFAULT NULL,
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(40) DEFAULT NULL,
  new_status VARCHAR(40) DEFAULT NULL,
  old_assigned_agent_id INT DEFAULT NULL,
  new_assigned_agent_id INT DEFAULT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_history_ticket (ticket_id),
  KEY idx_history_user (changed_by),
  KEY idx_history_old_agent (old_assigned_agent_id),
  KEY idx_history_new_agent (new_assigned_agent_id),
  CONSTRAINT fk_history_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sla_rules (
  id INT NOT NULL AUTO_INCREMENT,
  priority ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  response_hours INT NOT NULL,
  resolution_hours INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sla_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO sla_rules (priority, response_hours, resolution_hours)
VALUES
  ('LOW', 48, 120),
  ('MEDIUM', 24, 72),
  ('HIGH', 8, 32),
  ('CRITICAL', 2, 8)
ON DUPLICATE KEY UPDATE
  response_hours=VALUES(response_hours),
  resolution_hours=VALUES(resolution_hours);
