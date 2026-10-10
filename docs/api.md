# API overview

## Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

## Tickets
- POST /api/tickets
- GET /api/tickets
- GET /api/tickets/:id
- PATCH /api/tickets/:id/status
- PATCH /api/tickets/:id/assign
- POST /api/tickets/:id/auto-assign
- POST /api/tickets/:id/comments
- GET /api/tickets/:id/comments

## Categories
- GET /api/categories
- POST /api/categories
- PATCH /api/categories/:id
- DELETE /api/categories/:id

## Admin
- GET /api/admin/statistics
- GET /api/admin/sla-breaches
- GET /api/admin/agent-workload
- GET /api/admin/users
- PATCH /api/admin/users/:id

`PATCH /api/admin/users/:id` accepts `role` and/or `isActive`. Public account
registration cannot assign privileged roles.

## Dashboard
- GET /api/dashboard

The dashboard response is scoped to the authenticated customer or agent. Admins
receive the global ticket summary.

Ticket listing accepts `page`, `limit` (maximum 100), `status`, `priority`,
`category`, `assignedAgent`, `search`, `sortBy`, and `sortOrder`. Invalid
pagination or filter values return HTTP 400. Sort fields are allowlisted.

Ticket assignment accepts `{"assignedAgentId": 12}` to assign/reassign and
`{"assignedAgentId": null}` to unassign. Only an administrator can call the
manual or automatic assignment routes; an assigned user must be an active agent.

Status updates are limited to valid workflow transitions. Agents can change
statuses and comment only on tickets assigned to them; customers can comment
only on their own tickets. Comments, status changes, and assignment changes
write their associated history records transactionally.

The `/api/admin/sla-breaches` summary measures the first-response SLA for
unresolved tickets and includes breach counts/rate by priority. Resolved and
closed tickets are excluded.

Category deletion is a soft delete (`is_active = 0`) so historical tickets keep
their category relationship.

## Health
- GET /api/health

All API responses follow a consistent JSON structure with success flags and messages.
