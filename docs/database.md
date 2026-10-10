# Database design notes

## Tables
The schema includes users, categories, tickets, comments, ticket_history, and sla_rules.

### Users
Users are the central authentication and access-control entity. Each row stores name, email, password hash, role, and active status.

### Categories
Categories provide a logical grouping for support requests and maintain a unique category name constraint.

### Tickets
Tickets are the central business entity. Each ticket references a customer, optional assigned agent, and category. Ticket details include status, priority, SLA deadline, and timestamps.

### Comments and ticket_history
Comments capture user discussion on a ticket. History records every ticket state change and assignment event for traceability.

### SLA rules
SLA rules describe response and resolution targets by priority. The current ticket
workflow uses response hours for `sla_deadline`; resolution hours are stored for
future resolution-target measurement.

## Normalization
The schema normalizes repeated values into separate tables such as categories, users, and sla_rules. This reduces redundancy and keeps updates consistent.

## Relationships
- users -> tickets (customer)
- users -> tickets (assigned_agent)
- categories -> tickets
- tickets -> comments
- tickets -> ticket_history

The assignment-history agent columns also reference `users`. Categories are
deactivated with a soft delete so tickets can retain their category relationship.
Foreign keys restrict deletion of ticket owners and categories, null out deleted
assignment/actor references, and cascade ticket-owned comments and history.

## Joins
Ticket list and detail queries join tickets to category and user rows to show
category, customer, and assigned-agent names without duplicating those names in
the ticket table. Dashboard and SLA queries use aggregate expressions to return
counts by status and priority.

## Indexes
Indexes are placed on frequently filtered columns such as status, priority,
category, assignment, and the `(status, sla_deadline)` overdue-ticket lookup.
Assignment history references the previous and new agent through foreign keys.

## Transactions
Critical ticket workflows are wrapped in transactions so that create, update, and history insert operations either all succeed or all roll back.

## SLA fields
Each priority has a response-hours rule and a resolution-hours rule. The ticket's
`sla_deadline` represents its first-response deadline, calculated from
`response_hours`. Breach queries count only unresolved tickets whose deadline has
passed; resolved and closed tickets do not count as active breaches.

## Migrations
The runner applies ordered SQL files once and records each filename in
`schema_migrations`. Migration `002` adds assignment-history agent foreign keys,
positive SLA-hour constraints, and the combined status/deadline index.

## SQL examples
Examples for standard joins and filters are documented in docs/sql-examples.md.
