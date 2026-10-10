const pool = require('../config/db');

function normalizeSearchValue(value) {
  return `%${String(value).trim()}%`;
}

async function ensureTicketExists(ticketId) {
  const [rows] = await pool.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
  return rows[0] || null;
}

async function listTicketsForUser(user, query = {}) {
  const filters = [];
  const params = [];

  if (user.role === 'CUSTOMER') {
    filters.push('t.customer_id = ?');
    params.push(user.id);
  }

  if (user.role === 'AGENT') {
    filters.push('t.assigned_agent_id = ?');
    params.push(user.id);
  }

  if (query.status) {
    filters.push('t.status = ?');
    params.push(query.status);
  }

  if (query.priority) {
    filters.push('t.priority = ?');
    params.push(query.priority);
  }

  if (query.category) {
    filters.push('t.category_id = ?');
    params.push(Number(query.category));
  }

  if (query.assignedAgent) {
    filters.push('t.assigned_agent_id = ?');
    params.push(Number(query.assignedAgent));
  }

  if (query.search) {
    filters.push('(t.title LIKE ? OR t.description LIKE ? OR c.name LIKE ? OR customer.name LIKE ? OR agent.name LIKE ?)');
    const value = normalizeSearchValue(query.search);
    params.push(value, value, value, value, value);
  }

  const filterSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const sortMap = {
    id: 't.id',
    title: 't.title',
    status: 't.status',
    priority: 't.priority',
    created_at: 't.created_at',
    updated_at: 't.updated_at',
    sla_deadline: 't.sla_deadline'
  };

  const sortBy = sortMap[query.sortBy] || 't.created_at';
  const sortOrder = String(query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const limit = query.limit;
  const page = query.page;
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM tickets t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN users customer ON customer.id = t.customer_id
     LEFT JOIN users agent ON agent.id = t.assigned_agent_id
     ${filterSql}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT t.*, c.name AS category_name, customer.name AS customer_name, agent.name AS agent_name
     FROM tickets t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN users customer ON customer.id = t.customer_id
     LEFT JOIN users agent ON agent.id = t.assigned_agent_id
     ${filterSql}
     ORDER BY ${sortBy} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit)
    }
  };
}

async function getTicketDetail(ticketId, user) {
  const [rows] = await pool.query(
    `SELECT t.*, c.name AS category_name, customer.name AS customer_name, customer.email AS customer_email,
            agent.name AS agent_name, agent.email AS agent_email
     FROM tickets t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN users customer ON customer.id = t.customer_id
     LEFT JOIN users agent ON agent.id = t.assigned_agent_id
     WHERE t.id = ?`,
    [ticketId]
  );

  if (!rows.length) {
    const error = new Error('Ticket not found.');
    error.statusCode = 404;
    throw error;
  }

  const ticket = rows[0];

  if (user.role === 'CUSTOMER' && ticket.customer_id !== user.id) {
    const error = new Error('You cannot access another customer\'s ticket.');
    error.statusCode = 403;
    throw error;
  }

  if (user.role === 'AGENT' && ticket.assigned_agent_id !== user.id && user.role !== 'ADMIN') {
    const error = new Error('You can only view assigned tickets.');
    error.statusCode = 403;
    throw error;
  }

  return ticket;
}

async function createTicketForCustomer(customerId, payload) {
  const [categoryRows] = await pool.query('SELECT id, name FROM categories WHERE id = ? AND is_active = 1', [payload.categoryId]);
  if (!categoryRows.length) {
    const error = new Error('Category not found.');
    error.statusCode = 400;
    throw error;
  }

  const [customerRows] = await pool.query(
    'SELECT id FROM users WHERE id = ? AND role IN (?, ?) AND is_active = 1',
    [customerId, 'CUSTOMER', 'ADMIN']
  );
  if (!customerRows.length) {
    const error = new Error('Ticket customer must be an active customer.');
    error.statusCode = 400;
    throw error;
  }

  const [slaRows] = await pool.query(
    'SELECT response_hours FROM sla_rules WHERE priority = ? LIMIT 1',
    [payload.priority]
  );
  if (!slaRows.length || Number(slaRows[0].response_hours) <= 0) {
    const error = new Error(`A valid SLA rule is not configured for ${payload.priority} priority.`);
    error.statusCode = 500;
    throw error;
  }
  const responseHours = Number(slaRows[0].response_hours);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [ticketResult] = await connection.execute(
      `INSERT INTO tickets (customer_id, category_id, title, description, status, priority, sla_deadline, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'OPEN', ?, DATE_ADD(NOW(), INTERVAL ? HOUR), NOW(), NOW())`,
      [customerId, payload.categoryId, payload.title, payload.description, payload.priority, responseHours]
    );

    await connection.execute(
      `INSERT INTO ticket_history (ticket_id, changed_by, action, old_status, new_status, old_assigned_agent_id, new_assigned_agent_id, description, created_at)
       VALUES (?, ?, 'CREATED', NULL, 'OPEN', NULL, NULL, 'Ticket created', NOW())`,
      [ticketResult.insertId, customerId]
    );

    const [rows] = await connection.execute(
      `SELECT t.*, c.name AS category_name, customer.name AS customer_name, agent.name AS agent_name
       FROM tickets t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN users customer ON customer.id = t.customer_id
       LEFT JOIN users agent ON agent.id = t.assigned_agent_id
       WHERE t.id = ?`,
      [ticketResult.insertId]
    );
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateTicketStatus(ticketId, newStatus, user) {
  if (user.role !== 'ADMIN' && user.role !== 'AGENT') {
    const error = new Error('Only agents or admins can update ticket status.');
    error.statusCode = 403;
    throw error;
  }

  const validTransitions = {
    OPEN: ['IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'],
    IN_PROGRESS: ['WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'],
    WAITING_FOR_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    RESOLVED: ['CLOSED'],
    CLOSED: []
  };

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [ticketRows] = await connection.execute(
      'SELECT status, assigned_agent_id FROM tickets WHERE id = ? FOR UPDATE',
      [ticketId]
    );
    if (!ticketRows.length) {
      const error = new Error('Ticket not found.');
      error.statusCode = 404;
      throw error;
    }
    const ticket = ticketRows[0];

    if (user.role === 'AGENT' && ticket.assigned_agent_id !== user.id) {
      const error = new Error('You can only update assigned tickets.');
      error.statusCode = 403;
      throw error;
    }

    if (ticket.status === newStatus) {
      await connection.commit();
      const [rows] = await pool.query(
        `SELECT t.*, c.name AS category_name, customer.name AS customer_name, agent.name AS agent_name
         FROM tickets t
         LEFT JOIN categories c ON c.id = t.category_id
         LEFT JOIN users customer ON customer.id = t.customer_id
         LEFT JOIN users agent ON agent.id = t.assigned_agent_id
         WHERE t.id = ?`,
        [ticketId]
      );
      return rows[0];
    }

    if (!validTransitions[ticket.status] || !validTransitions[ticket.status].includes(newStatus)) {
      const error = new Error(`Invalid status transition from ${ticket.status} to ${newStatus}.`);
      error.statusCode = 400;
      throw error;
    }

    await connection.execute(
      `UPDATE tickets
       SET status = ?, updated_at = NOW(),
           resolved_at = CASE WHEN ? IN ('RESOLVED', 'CLOSED') THEN COALESCE(resolved_at, NOW()) ELSE resolved_at END
       WHERE id = ?`,
      [newStatus, newStatus, ticketId]
    );

    await connection.execute(
      `INSERT INTO ticket_history (ticket_id, changed_by, action, old_status, new_status, old_assigned_agent_id, new_assigned_agent_id, description, created_at)
       VALUES (?, ?, 'STATUS_CHANGED', ?, ?, ?, ?, ?, NOW())`,
      [ticketId, user.id, ticket.status, newStatus, ticket.assigned_agent_id, ticket.assigned_agent_id, `Status changed from ${ticket.status} to ${newStatus}`]
    );

    const [rows] = await connection.execute(
      `SELECT t.*, c.name AS category_name, customer.name AS customer_name, agent.name AS agent_name
       FROM tickets t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN users customer ON customer.id = t.customer_id
       LEFT JOIN users agent ON agent.id = t.assigned_agent_id
       WHERE t.id = ?`,
      [ticketId]
    );
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function assignTicket(ticketId, assignedAgentId, user) {
  if (user.role !== 'ADMIN') {
    const error = new Error('Only admins can assign tickets.');
    error.statusCode = 403;
    throw error;
  }

  if (assignedAgentId !== null && !Number.isInteger(assignedAgentId)) {
    const error = new Error('Assigned agent ID must be a positive integer or null.');
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [ticketRows] = await connection.execute(
      'SELECT id, status, assigned_agent_id FROM tickets WHERE id = ? FOR UPDATE',
      [ticketId]
    );
    if (!ticketRows.length) {
      const error = new Error('Ticket not found.');
      error.statusCode = 404;
      throw error;
    }
    const ticket = ticketRows[0];

    if (assignedAgentId !== null) {
      const [agentRows] = await connection.execute(
        'SELECT id FROM users WHERE id = ? AND role = ? AND is_active = 1 FOR UPDATE',
        [assignedAgentId, 'AGENT']
      );
      if (!agentRows.length) {
        const error = new Error('Assigned agent must be an active agent.');
        error.statusCode = 400;
        throw error;
      }
    }

    if (ticket.assigned_agent_id === assignedAgentId) {
      await connection.commit();
      const [rows] = await pool.query(
        `SELECT t.*, c.name AS category_name, customer.name AS customer_name, agent.name AS agent_name
         FROM tickets t
         LEFT JOIN categories c ON c.id = t.category_id
         LEFT JOIN users customer ON customer.id = t.customer_id
         LEFT JOIN users agent ON agent.id = t.assigned_agent_id
         WHERE t.id = ?`,
        [ticketId]
      );
      return rows[0];
    }

    await connection.execute(
      'UPDATE tickets SET assigned_agent_id = ?, updated_at = NOW() WHERE id = ?',
      [assignedAgentId, ticketId]
    );

    await connection.execute(
      `INSERT INTO ticket_history (ticket_id, changed_by, action, old_status, new_status, old_assigned_agent_id, new_assigned_agent_id, description, created_at)
       VALUES (?, ?, 'ASSIGNED', ?, ?, ?, ?, ?, NOW())`,
      [ticketId, user.id, ticket.status, ticket.status, ticket.assigned_agent_id, assignedAgentId, `Assignment changed from ${ticket.assigned_agent_id || 'unassigned'} to ${assignedAgentId || 'unassigned'}`]
    );

    const [rows] = await connection.execute(
      `SELECT t.*, c.name AS category_name, customer.name AS customer_name, agent.name AS agent_name
       FROM tickets t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN users customer ON customer.id = t.customer_id
       LEFT JOIN users agent ON agent.id = t.assigned_agent_id
       WHERE t.id = ?`,
      [ticketId]
    );
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function autoAssignTicket(ticketId, user) {
  if (user.role !== 'ADMIN') {
    const error = new Error('Only admins can auto-assign tickets.');
    error.statusCode = 403;
    throw error;
  }

  const ticket = await ensureTicketExists(ticketId);
  if (!ticket) {
    const error = new Error('Ticket not found.');
    error.statusCode = 404;
    throw error;
  }

  const [agentRows] = await pool.query(
    `SELECT u.id
     FROM users u
     LEFT JOIN tickets t ON t.assigned_agent_id = u.id
       AND t.status NOT IN ('RESOLVED', 'CLOSED')
       AND t.id <> ?
     WHERE u.role = 'AGENT' AND u.is_active = 1
     GROUP BY u.id
     ORDER BY COUNT(t.id) ASC, u.id ASC
     LIMIT 1`,
    [ticketId]
  );

  if (!agentRows.length) {
    const error = new Error('No active agents available for auto-assignment.');
    error.statusCode = 400;
    throw error;
  }

  return assignTicket(ticketId, agentRows[0].id, user);
}

async function addCommentToTicket(ticketId, user, commentText) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [ticketRows] = await connection.execute(
      'SELECT customer_id, assigned_agent_id, status FROM tickets WHERE id = ? FOR UPDATE',
      [ticketId]
    );
    if (!ticketRows.length) {
      const error = new Error('Ticket not found.');
      error.statusCode = 404;
      throw error;
    }
    const ticket = ticketRows[0];
    if (user.role === 'CUSTOMER' && ticket.customer_id !== user.id) {
      const error = new Error('You cannot comment on another customer\'s ticket.');
      error.statusCode = 403;
      throw error;
    }
    if (user.role === 'AGENT' && ticket.assigned_agent_id !== user.id) {
      const error = new Error('You can only comment on assigned tickets.');
      error.statusCode = 403;
      throw error;
    }

    const [commentResult] = await connection.execute(
      'INSERT INTO comments (ticket_id, user_id, comment, created_at) VALUES (?, ?, ?, NOW())',
      [ticketId, user.id, commentText]
    );

    await connection.execute(
      `INSERT INTO ticket_history (ticket_id, changed_by, action, old_status, new_status, old_assigned_agent_id, new_assigned_agent_id, description, created_at)
       VALUES (?, ?, 'COMMENTED', ?, ?, ?, ?, ?, NOW())`,
      [ticketId, user.id, ticket.status, ticket.status, ticket.assigned_agent_id, ticket.assigned_agent_id, `Comment added by ${user.name}`]
    );

    const [rows] = await connection.execute(
      `SELECT c.id, c.comment, c.created_at, u.name AS user_name, u.role AS user_role
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
      [commentResult.insertId]
    );
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getCommentsForTicket(ticketId, user) {
  await getTicketDetail(ticketId, user);
  const [rows] = await pool.query(
    `SELECT c.id, c.comment, c.created_at, u.name AS user_name, u.role AS user_role
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.ticket_id = ?
     ORDER BY c.created_at ASC`,
    [ticketId]
  );
  return rows;
}

async function getTicketHistoryForTicket(ticketId, user) {
  await getTicketDetail(ticketId, user);
  const [rows] = await pool.query(
    `SELECT th.*, changer.name AS changed_by_name
     FROM ticket_history th
     LEFT JOIN users changer ON changer.id = th.changed_by
     WHERE th.ticket_id = ?
     ORDER BY th.created_at ASC`,
    [ticketId]
  );
  return rows;
}

async function getAdminStatistics() {
  const [stats] = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM tickets) AS total_tickets,
      (SELECT COUNT(*) FROM tickets WHERE status = 'OPEN') AS open_tickets,
      (SELECT COUNT(*) FROM tickets WHERE status = 'IN_PROGRESS') AS in_progress_tickets,
      (SELECT COUNT(*) FROM tickets WHERE status = 'RESOLVED') AS resolved_tickets,
      (SELECT COUNT(*) FROM tickets WHERE status = 'CLOSED') AS closed_tickets,
      (SELECT COUNT(*) FROM tickets WHERE priority IN ('HIGH', 'CRITICAL')) AS high_critical_tickets,
      (SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER') AS total_customers,
      (SELECT COUNT(*) FROM users WHERE role = 'AGENT') AS total_agents,
      (SELECT COUNT(*) FROM users WHERE role = 'ADMIN') AS total_admins,
      (SELECT COUNT(*) FROM tickets WHERE status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < NOW()) AS sla_breaches,
      (SELECT COUNT(*) FROM tickets WHERE status NOT IN ('RESOLVED', 'CLOSED')) AS unresolved_tickets,
      (SELECT COALESCE(ROUND(100 * SUM(status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < NOW()) / NULLIF(SUM(status NOT IN ('RESOLVED', 'CLOSED')), 0), 1), 0) FROM tickets) AS sla_breach_rate`
  );

  const [recent] = await pool.query(
    `SELECT t.*, c.name AS category_name, customer.name AS customer_name
     FROM tickets t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN users customer ON customer.id = t.customer_id
     ORDER BY t.created_at DESC
     LIMIT 5`
  );

  return { ...stats[0], recentTickets: recent };
}

async function getSlaBreachesSummary() {
  const [rows] = await pool.query(
    `SELECT t.id, t.title, t.priority, t.status, t.sla_deadline, customer.name AS customer_name, agent.name AS agent_name,
            c.name AS category_name
     FROM tickets t
     LEFT JOIN users customer ON customer.id = t.customer_id
     LEFT JOIN users agent ON agent.id = t.assigned_agent_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.status NOT IN ('RESOLVED', 'CLOSED') AND t.sla_deadline < NOW()
     ORDER BY t.sla_deadline ASC`
  );

  const [summary] = await pool.query(
    `SELECT
      COUNT(*) AS total_tickets,
      COALESCE(SUM(status NOT IN ('RESOLVED', 'CLOSED')), 0) AS unresolved_tickets,
      COALESCE(SUM(status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < NOW()), 0) AS breach_count,
      COALESCE(ROUND(100 * SUM(status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < NOW()) /
        NULLIF(SUM(status NOT IN ('RESOLVED', 'CLOSED')), 0), 1), 0) AS breach_rate,
      COALESCE(SUM(status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < NOW() AND priority = 'CRITICAL'), 0) AS critical_breaches,
      COALESCE(SUM(status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < NOW() AND priority = 'HIGH'), 0) AS high_breaches,
      COALESCE(SUM(status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < NOW() AND priority = 'MEDIUM'), 0) AS medium_breaches,
      COALESCE(SUM(status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < NOW() AND priority = 'LOW'), 0) AS low_breaches
     FROM tickets`
  );

  return {
    breaches: rows,
    summary: summary[0]
  };
}

async function getAgentWorkload() {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email,
            COUNT(t.id) AS unresolved_tickets,
            SUM(CASE WHEN t.priority = 'CRITICAL' THEN 1 ELSE 0 END) AS critical_tickets,
            SUM(CASE WHEN t.priority = 'HIGH' THEN 1 ELSE 0 END) AS high_tickets
     FROM users u
     LEFT JOIN tickets t ON t.assigned_agent_id = u.id AND t.status NOT IN ('RESOLVED', 'CLOSED')
     WHERE u.role = 'AGENT' AND u.is_active = 1
     GROUP BY u.id, u.name, u.email
     ORDER BY unresolved_tickets DESC, u.name ASC`
  );
  return rows;
}

async function getUsersForAdmin() {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC`
  );
  return rows;
}

async function updateUserForAdmin(userId, updates, actor) {
  if (Number(userId) === actor.id && ((updates.role && updates.role !== 'ADMIN') || updates.isActive === false)) {
    const error = new Error('You cannot change your own administrator role or deactivate your account.');
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute(
      'SELECT id, role, is_active FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    if (!existing.length) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    const currentUser = existing[0];
    const role = updates.role ?? currentUser.role;
    const isActive = updates.isActive ?? Boolean(currentUser.is_active);
    if (currentUser.role === 'AGENT' && (role !== 'AGENT' || !isActive)) {
      const [assignedRows] = await connection.execute(
        `SELECT COUNT(*) AS total
         FROM tickets
         WHERE assigned_agent_id = ? AND status NOT IN ('RESOLVED', 'CLOSED')`,
        [userId]
      );
      if (Number(assignedRows[0].total) > 0) {
        const error = new Error('Reassign or resolve this agent\'s active tickets before changing their role or deactivating them.');
        error.statusCode = 409;
        throw error;
      }
    }

    await connection.execute(
      'UPDATE users SET role = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [role, isActive ? 1 : 0, userId]
    );
    const [rows] = await connection.execute(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getDashboardForUser(user) {
  const scopeColumn = user.role === 'CUSTOMER' ? 'customer_id' : 'assigned_agent_id';
  const scoped = user.role === 'ADMIN' ? '' : `WHERE ${scopeColumn} = ?`;
  const params = user.role === 'ADMIN' ? [] : [user.id];
  const [statsRows] = await pool.query(
    `SELECT
       COUNT(*) AS total_tickets,
        COALESCE(SUM(status = 'OPEN'), 0) AS open_tickets,
        COALESCE(SUM(status = 'IN_PROGRESS'), 0) AS in_progress_tickets,
        COALESCE(SUM(status = 'WAITING_FOR_CUSTOMER'), 0) AS waiting_for_customer_tickets,
        COALESCE(SUM(status = 'RESOLVED'), 0) AS resolved_tickets,
        COALESCE(SUM(status = 'CLOSED'), 0) AS closed_tickets,
        COALESCE(SUM(status NOT IN ('RESOLVED', 'CLOSED') AND priority IN ('HIGH', 'CRITICAL')), 0) AS high_critical_tickets,
        COALESCE(SUM(status NOT IN ('RESOLVED', 'CLOSED') AND priority = 'CRITICAL'), 0) AS critical_tickets,
        COALESCE(SUM(status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < NOW()), 0) AS sla_breaches,
        MIN(CASE WHEN status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline >= NOW() THEN sla_deadline END) AS next_sla_deadline
     FROM tickets ${scoped}`,
    params
  );
  const [recentTickets] = await pool.query(
    `SELECT t.*, c.name AS category_name, customer.name AS customer_name, agent.name AS agent_name
     FROM tickets t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN users customer ON customer.id = t.customer_id
     LEFT JOIN users agent ON agent.id = t.assigned_agent_id
     ${scoped.replace('customer_id', 't.customer_id').replace('assigned_agent_id', 't.assigned_agent_id')}
     ORDER BY t.created_at DESC
     LIMIT 5`,
    params
  );
  const [highPriorityTickets] = await pool.query(
    `SELECT t.*, c.name AS category_name, customer.name AS customer_name, agent.name AS agent_name
     FROM tickets t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN users customer ON customer.id = t.customer_id
     LEFT JOIN users agent ON agent.id = t.assigned_agent_id
     ${scoped.replace('customer_id', 't.customer_id').replace('assigned_agent_id', 't.assigned_agent_id')}
     ${scoped ? 'AND' : 'WHERE'} t.status NOT IN ('RESOLVED', 'CLOSED')
       AND t.priority IN ('HIGH', 'CRITICAL')
     ORDER BY CASE t.priority WHEN 'CRITICAL' THEN 1 ELSE 2 END, t.sla_deadline ASC
     LIMIT 5`,
    params
  );

  return { ...statsRows[0], recentTickets, highPriorityTickets };
}

module.exports = {
  listTicketsForUser,
  getTicketDetail,
  createTicketForCustomer,
  updateTicketStatus,
  assignTicket,
  autoAssignTicket,
  addCommentToTicket,
  getCommentsForTicket,
  getTicketHistoryForTicket,
  getAdminStatistics,
  getSlaBreachesSummary,
  getAgentWorkload,
  getUsersForAdmin,
  updateUserForAdmin,
  getDashboardForUser
};
