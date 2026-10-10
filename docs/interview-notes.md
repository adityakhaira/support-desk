# Interview notes

## Why MySQL?
MySQL is a mature, widely used relational database that is easy to reason about for a ticket system. It supports strong relationships, transactions, and a serializable design for real business workflows.

## Why not MongoDB?
MongoDB is document-oriented and flexible, but this project benefits from relational constraints, transactions, and clear joins. SupportDesk is a classic relational workflow with strong consistency requirements.

## Why normalization?
Normalization reduces duplication and helps keep the schema reliable. For example, categories and users are stored separately to avoid repeated values and inconsistent updates.

## Why indexes?
Indexes keep queries fast on fields such as status, priority, agent, and ticket deadlines, especially when ticket volumes increase.

## Why transactions?
When creating tickets or changing statuses, multiple writes happen as a group. Transactions ensure that the ticket, history, and related records remain consistent.

## Authentication vs authorization
Authentication proves who a user is. Authorization determines what they are allowed to do. JWTs help authenticate users; role checks then authorize their actions.

## How JWT works
The server creates a signed token containing user identity and claims. The client sends it on later requests, and the backend verifies its signature before accepting it.

## How SQL injection is prevented
This project uses mysql2 parameterized queries and whitelisted sorting rules to ensure user input is never concatenated directly into SQL strings.

## How would you scale this?
This project can scale by adding read replicas, optimizing indexes, caching dashboards, and moving heavy reporting to a separate reporting layer later.

## Why not microservices/Redis/Kafka?
This application is intentionally kept simple. The business logic and data access are straightforward, and a monolithic architecture is a better fit for learning and interview demonstration.
