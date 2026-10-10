# SupportDesk

SupportDesk is a full-stack help desk and ticket management system built with React, Express, and MySQL. It supports customer, agent, and admin workflows across authentication, ticket updates, comments, assignment, SLA monitoring, and dashboards.

## Features
- Customer registration and login
- JWT authentication with secure cookie handling
- Role-based access control for customers, agents, and admins
- Ticket creation, listing, detail views, comments, and history
- Administrator assignment/reassignment and least-loaded auto-assignment
- Priority-based first-response SLA deadlines, breach lists, and breach-rate summaries
- Role-scoped customer, agent, and administrator dashboards
- Administrator user role/activation controls and category create/edit/deactivate
- Versioned MySQL migrations, foreign keys, indexes, and development seed data
- Jest and Supertest integration tests, including transaction rollback coverage

## Technology stack
- Frontend: React + Vite + React Router
- Backend: Node.js + Express + MySQL2 + JWT + bcryptjs + Zod
- Database: MySQL 8+
- Testing: Jest + Supertest

## Architecture
The project follows a simple monolithic design:

React front end -> Express REST API -> MySQL database

## Local setup
### 1. Start MySQL
The project includes Docker Compose for MySQL:

```bash
copy .env.example .env
copy backend\.env.example backend\.env
```

Set a local development password in the root `.env` file, and set the same
value as `DB_PASSWORD` in `backend\.env`. Then start MySQL:

```bash
docker compose up -d mysql
```

Docker Compose exposes MySQL on port `3306`. For an existing MySQL server, create
the `supportdesk` database and update the backend environment values to match
that server.

### 2. Configure backend environment

The previous copy command creates `backend\.env`; edit its database connection
values and replace the JWT secret placeholder with a long, unique local secret.

### 3. Run database migrations
```bash
npm install
npm run migrate
npm run seed
```

Migrations are recorded in the `schema_migrations` table and only applied once.
The migration user must be allowed to create the database (if it does not exist)
and create/alter tables in it. Seed scripts are intended for local development.

### 4. Start backend
```bash
npm run dev
```

### 5. Start frontend
```bash
cd ../frontend
npm install
npm run dev
```

## Development seed accounts
The SQL seed supplies administrator, agent, and customer accounts for local
testing. Passwords are development-only fixtures used by the integration tests;
do not reuse them or deploy the seed accounts to a production environment.

## API health
```bash
curl http://localhost:5000/api/health
```

## Testing
```bash
cd backend
npm test
```

## Important notes
- All SQL is parameterized through mysql2.
- Role checks are enforced in the backend middleware, not only in the frontend.
- Public registration always creates a customer; an administrator must grant
  agent or administrator roles.
- Tickets use priority-specific response-hour rules for their first-response
  SLA deadline. Breaches include unresolved tickets only; resolved and closed
  tickets are excluded.
- Ticket history records create, assignment, status, and comment events.
- Administrators cannot deactivate themselves or demote their own account.
- Agents with unresolved assigned tickets cannot be deactivated or demoted until
  those tickets have been reassigned or resolved.
