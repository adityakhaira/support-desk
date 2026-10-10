process.env.JWT_SECRET = process.env.JWT_SECRET || 'supportdesk-test-secret';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const pool = require('../src/config/db');
const ticketService = require('../src/services/ticketService');

let adminToken;
let customerToken;
let secondCustomerToken;
let agentToken;
let secondAgentToken;

async function login(email, password) {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  expect(response.status).toBe(200);
  return response.body.token;
}

async function createTicket(token = customerToken, priority = 'MEDIUM') {
  const response = await request(app)
    .post('/api/tickets')
    .set('Authorization', `Bearer ${token}`)
    .send({
      categoryId: 2,
      title: `Regression ticket ${Date.now()}-${Math.random()}`,
      description: 'A sufficiently detailed description for the support ticket integration test.',
      priority
    });
  expect(response.status).toBe(201);
  return response.body.ticket;
}

beforeAll(async () => {
  await pool.query('SELECT 1');
  adminToken = await login('admin@supportdesk.local', 'Admin@123');
  customerToken = await login('olivia.customer@supportdesk.local', 'Customer@123');
  secondCustomerToken = await login('mason.customer@supportdesk.local', 'Customer@123');
  agentToken = await login('ava.agent@supportdesk.local', 'Agent@123');
  secondAgentToken = await login('ben.agent@supportdesk.local', 'Agent@123');
});

afterAll(async () => {
  await pool.end();
});

describe('authentication and authorization', () => {
  test('demo credentials match both the seed hashes and the rows loaded in MySQL', async () => {
    const seedPath = path.join(__dirname, '..', '..', 'database', 'seeds', '001_seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    const demoCredentials = [
      { email: 'admin@supportdesk.local', password: 'Admin@123' },
      { email: 'ava.agent@supportdesk.local', password: 'Agent@123' },
      { email: 'olivia.customer@supportdesk.local', password: 'Customer@123' }
    ];

    for (const { email, password } of demoCredentials) {
      const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const seedRow = seedSql.match(new RegExp(`'${escapedEmail}',\\s*'([^']+)'`));
      expect(seedRow).not.toBeNull();
      expect(await bcrypt.compare(password, seedRow[1])).toBe(true);

      const [users] = await pool.query(
        'SELECT password_hash FROM users WHERE email = ?',
        [email]
      );
      expect(users).toHaveLength(1);
      expect(users[0].password_hash).toBe(seedRow[1]);
      expect(await bcrypt.compare(password, users[0].password_hash)).toBe(true);
    }
  });

  test('registers customers but cannot grant an elevated role through public registration', async () => {
    const email = `newtester-${Date.now()}@example.com`;
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New Tester', email, password: 'StrongPass123', role: 'ADMIN' });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.role).toBe('CUSTOMER');
    expect(response.body.user.password_hash).toBeUndefined();
  });

  test('logs in with valid credentials and rejects an invalid password', async () => {
    const success = await request(app)
      .post('/api/auth/login')
      .send({ email: 'olivia.customer@supportdesk.local', password: 'Customer@123' });
    const failure = await request(app)
      .post('/api/auth/login')
      .send({ email: 'olivia.customer@supportdesk.local', password: 'WrongPassword123' });

    expect(success.status).toBe(200);
    expect(success.body.user.role).toBe('CUSTOMER');
    expect(success.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    expect(failure.status).toBe(401);
  });

  test('requires authentication and blocks non-admin access to admin APIs', async () => {
    const anonymous = await request(app).get('/api/tickets');
    const customer = await request(app)
      .get('/api/admin/statistics')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(anonymous.status).toBe(401);
    expect(customer.status).toBe(403);
  });

  test('rejects a customer attempting to read another customer ticket', async () => {
    const ticket = await createTicket(customerToken);
    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${secondCustomerToken}`);

    expect(response.status).toBe(403);
  });

  test('schema enforces assignment history foreign keys and the SLA index', async () => {
    const [constraints] = await pool.query(
      `SELECT CONSTRAINT_NAME
       FROM information_schema.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = ? AND CONSTRAINT_NAME IN ('fk_history_old_agent', 'fk_history_new_agent')`,
      [process.env.DB_NAME || 'supportdesk']
    );
    const [indexes] = await pool.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tickets' AND INDEX_NAME = 'idx_tickets_status_sla_deadline'`,
      [process.env.DB_NAME || 'supportdesk']
    );
    expect(constraints).toHaveLength(2);
    expect(indexes.length).toBeGreaterThan(0);
  });
});

describe('ticket workflows', () => {
  test.each([
    ['LOW', 2880],
    ['MEDIUM', 1440],
    ['HIGH', 480],
    ['CRITICAL', 120]
  ])('uses the %s response SLA rule to calculate the deadline', async (priority, expectedMinutes) => {
    const ticket = await createTicket(customerToken, priority);
    const [[timeDiff]] = await pool.query(
      'SELECT TIMESTAMPDIFF(MINUTE, created_at, sla_deadline) AS minutes FROM tickets WHERE id = ?',
      [ticket.id]
    );
    expect(Math.abs(Number(timeDiff.minutes) - expectedMinutes)).toBeLessThanOrEqual(1);
  });

  test('creates tickets atomically with the configured response SLA deadline and history', async () => {
    const ticket = await createTicket(customerToken, 'CRITICAL');
    const [[timeDiff]] = await pool.query(
      'SELECT TIMESTAMPDIFF(MINUTE, created_at, sla_deadline) AS minutes FROM tickets WHERE id = ?',
      [ticket.id]
    );
    const [history] = await pool.query(
      'SELECT action, new_status FROM ticket_history WHERE ticket_id = ? ORDER BY id',
      [ticket.id]
    );

    expect(Math.abs(Number(timeDiff.minutes) - 120)).toBeLessThanOrEqual(1);
    expect(history[0]).toMatchObject({ action: 'CREATED', new_status: 'OPEN' });
  });

  test('agent can transition an assigned ticket, while invalid transitions are rejected', async () => {
    const ticket = await createTicket();
    const assigned = await request(app)
      .patch(`/api/tickets/${ticket.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedAgentId: 2 });
    const started = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'IN_PROGRESS' });
    const resolved = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'RESOLVED' });
    const closed = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'CLOSED' });
    const reopened = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'OPEN' });

    expect(assigned.status).toBe(200);
    expect(started.status).toBe(200);
    expect(resolved.body.ticket.resolved_at).toBeTruthy();
    expect(closed.status).toBe(200);
    expect(closed.body.ticket.resolved_at).toBeTruthy();
    expect(reopened.status).toBe(400);
    expect(reopened.body.message).toMatch(/Invalid status transition/i);
  });

  test('assignment requires an administrator and a valid active agent and records every change', async () => {
    const ticket = await createTicket();
    const denied = await request(app)
      .patch(`/api/tickets/${ticket.id}/assign`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ assignedAgentId: 2 });
    const invalidAgent = await request(app)
      .patch(`/api/tickets/${ticket.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedAgentId: 5 });

    expect(denied.status).toBe(403);
    expect(invalidAgent.status).toBe(400);

    for (const agentId of [2, 3, null]) {
      const response = await request(app)
        .patch(`/api/tickets/${ticket.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedAgentId: agentId });
      expect(response.status).toBe(200);
      expect(response.body.ticket.assigned_agent_id).toBe(agentId);
    }

    const [history] = await pool.query(
      `SELECT old_assigned_agent_id, new_assigned_agent_id
       FROM ticket_history WHERE ticket_id = ? AND action = 'ASSIGNED' ORDER BY id`,
      [ticket.id]
    );
    expect(history).toHaveLength(3);
    expect(history[0]).toMatchObject({ old_assigned_agent_id: null, new_assigned_agent_id: 2 });
    expect(history[1]).toMatchObject({ old_assigned_agent_id: 2, new_assigned_agent_id: 3 });
    expect(history[2]).toMatchObject({ old_assigned_agent_id: 3, new_assigned_agent_id: null });
  });

  test('only admins can auto-assign; assignment goes to an active agent', async () => {
    const ticket = await createTicket();
    const denied = await request(app)
      .post(`/api/tickets/${ticket.id}/auto-assign`)
      .set('Authorization', `Bearer ${agentToken}`);
    const response = await request(app)
      .post(`/api/tickets/${ticket.id}/auto-assign`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(denied.status).toBe(403);
    expect(response.status).toBe(200);
    expect(response.body.ticket.assigned_agent_id).toBeTruthy();
  });

  test('allows ticket comments only to the customer owner or assigned agent', async () => {
    const ticket = await createTicket();
    const forbidden = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set('Authorization', `Bearer ${secondCustomerToken}`)
      .send({ comment: 'This must not be visible on the other customer ticket.' });
    const allowed = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ comment: 'Please let me know when this has been investigated.' });

    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(201);
  });

  test('scopes role dashboards and validates pagination/filter/sort inputs', async () => {
    const customerTickets = await request(app)
      .get('/api/tickets')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${customerToken}`);
    const dashboard = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);
    const badPage = await request(app)
      .get('/api/tickets')
      .query({ page: -1 })
      .set('Authorization', `Bearer ${customerToken}`);
    const unsafeSort = await request(app)
      .get('/api/tickets')
      .query({ sortBy: 'created_at; DROP TABLE users' })
      .set('Authorization', `Bearer ${adminToken}`);
    const injectedSearch = await request(app)
      .get('/api/tickets')
      .query({ search: "%' OR 1=1 --" })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(customerTickets.status).toBe(200);
    expect(customerTickets.body.pagination.limit).toBe(2);
    expect(dashboard.body.total_tickets).toBe(customerTickets.body.pagination.total);
    expect(badPage.status).toBe(400);
    expect(unsafeSort.status).toBe(400);
    expect(injectedSearch.status).toBe(200);
    expect(Array.isArray(injectedSearch.body.data)).toBe(true);
    expect(injectedSearch.body.pagination.total).toBe(0);
  });

  test('agent dashboard includes assigned high-priority tickets and SLA counts', async () => {
    const ticket = await createTicket(customerToken, 'CRITICAL');
    await request(app)
      .patch(`/api/tickets/${ticket.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedAgentId: 2 });
    await pool.query(
      'UPDATE tickets SET sla_deadline = DATE_SUB(NOW(), INTERVAL 1000 HOUR) WHERE id = ?',
      [ticket.id]
    );
    const response = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${agentToken}`);
    const denied = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${secondAgentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.highPriorityTickets.some((entry) => entry.id === ticket.id)).toBe(true);
    expect(response.body.recentTickets.every((entry) => entry.assigned_agent_id === 2)).toBe(true);
    expect(response.body.sla_breaches).toBeDefined();
    expect(denied.status).toBe(403);
  });
});

describe('administration and SLA reporting', () => {
  test('SLA breach reports exclude resolved and closed overdue tickets', async () => {
    const unresolved = await createTicket(customerToken, 'CRITICAL');
    const resolved = await createTicket(customerToken, 'HIGH');
    const closed = await createTicket(customerToken, 'MEDIUM');
    await pool.query('UPDATE tickets SET sla_deadline = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE id IN (?, ?, ?)', [
      unresolved.id, resolved.id, closed.id
    ]);
    await pool.query("UPDATE tickets SET status = 'RESOLVED', resolved_at = NOW() WHERE id = ?", [resolved.id]);
    await pool.query("UPDATE tickets SET status = 'CLOSED', resolved_at = NOW() WHERE id = ?", [closed.id]);

    const response = await request(app)
      .get('/api/admin/sla-breaches')
      .set('Authorization', `Bearer ${adminToken}`);
    const breach = response.body.breaches.find((item) => item.id === unresolved.id);
    const completedIds = response.body.breaches.map((item) => item.id);

    expect(response.status).toBe(200);
    expect(breach).toBeTruthy();
    expect(completedIds).not.toContain(resolved.id);
    expect(completedIds).not.toContain(closed.id);
    expect(Number(response.body.summary.breach_count)).toBeGreaterThan(0);
    expect(Number(response.body.summary.breach_rate)).toBeGreaterThanOrEqual(0);
  });

  test('admin statistics and agent workload are populated from database queries', async () => {
    const [stats, workload] = await Promise.all([
      request(app).get('/api/admin/statistics').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/admin/agent-workload').set('Authorization', `Bearer ${adminToken}`)
    ]);
    expect(stats.status).toBe(200);
    expect(Number(stats.body.total_tickets)).toBeGreaterThan(0);
    expect(Array.isArray(workload.body.workload)).toBe(true);
  });

  test('administrator can create, update, and deactivate categories; other roles cannot', async () => {
    const name = `Test category ${Date.now()}`;
    const denied = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name, description: 'Permission check' });
    const created = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, description: 'Initial description' });
    const updated = await request(app)
      .patch(`/api/categories/${created.body.category?.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `${name} updated`, description: 'Updated description' });
    const updateDenied = await request(app)
      .patch(`/api/categories/${created.body.category?.id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: `${name} denied`, description: 'No access' });
    const deleted = await request(app)
      .delete(`/api/categories/${created.body.category?.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(denied.status).toBe(403);
    expect(created.status).toBe(201);
    expect(updated.status).toBe(200);
    expect(updateDenied.status).toBe(403);
    expect(deleted.status).toBe(200);
  });

  test('admin can update user role and active state without allowing self-lockout', async () => {
    const email = `managed-user-${Date.now()}@example.com`;
    const created = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Managed User', email, password: 'StrongPass123' });
    const managedId = created.body.user.id;
    const updated = await request(app)
      .patch(`/api/admin/users/${managedId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'AGENT', isActive: true });
    const ticket = await createTicket(customerToken);
    await request(app)
      .patch(`/api/tickets/${ticket.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedAgentId: managedId });
    const blockedDeactivation = await request(app)
      .patch(`/api/admin/users/${managedId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    await request(app)
      .patch(`/api/tickets/${ticket.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedAgentId: null });
    const deactivated = await request(app)
      .patch(`/api/admin/users/${managedId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    const selfDeactivation = await request(app)
      .patch(`/api/admin/users/${(await pool.query("SELECT id FROM users WHERE email = 'admin@supportdesk.local'"))[0][0].id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(updated.status).toBe(200);
    expect(updated.body.user.role).toBe('AGENT');
    expect(updated.body.user.password_hash).toBeUndefined();
    expect(blockedDeactivation.status).toBe(409);
    expect(deactivated.status).toBe(200);
    expect(selfDeactivation.status).toBe(400);
  });
});

describe('transaction rollback', () => {
  test('rolls back ticket creation if writing the history row fails', async () => {
    const failure = new Error('simulated history insert failure');
    const connection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn()
        .mockResolvedValueOnce([{ insertId: 900001 }, []])
        .mockRejectedValueOnce(failure),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn()
    };
    const connectionSpy = jest.spyOn(pool, 'getConnection').mockResolvedValue(connection);

    try {
      await expect(ticketService.createTicketForCustomer(5, {
        categoryId: 2,
        title: 'Rollback test ticket',
        description: 'This request should be rolled back when its history insert fails.',
        priority: 'MEDIUM'
      })).rejects.toThrow(failure);
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    } finally {
      connectionSpy.mockRestore();
    }
  });
});
