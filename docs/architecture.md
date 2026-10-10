# SupportDesk architecture

SupportDesk uses a simple three-layer architecture:

- Frontend: React single-page app
- Backend: Express REST API
- Data layer: MySQL 8 database

Requests flow from the browser through the React app into the Express API where validation, authorization, and SQL queries are handled. The database stores the user, ticket, comment, and SLA data required by the application.

## Modules
- Auth: registration, login, logout, current-user lookup
- Tickets: creation, retrieval, status change, assignment, auto-assignment, comments
- Admin: statistics, SLA breach reporting, user listing, category management
- Database: migration and seed scripts for local development

## Why this design?
The project is intentionally simple and interview-friendly. It demonstrates clear separation between presentation, API logic, and persistence without adding extra infrastructure or complexity.
