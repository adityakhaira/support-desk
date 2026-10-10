INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
VALUES
  (1, 'System Admin', 'admin@supportdesk.local', '$2a$10$f1yAkZTcyG4WpYABbMsnWeC1yro/lGh7PUXWQpe1h3IRJfms1M2IK', 'ADMIN', 1, NOW(), NOW()),
  (2, 'Ava Johnson', 'ava.agent@supportdesk.local', '$2a$10$5OaNzbR1QJBQMahwZsEkfOGGiETrLbFqfl.rY2.Ur8MPLnhD/DQee', 'AGENT', 1, NOW(), NOW()),
  (3, 'Ben Carter', 'ben.agent@supportdesk.local', '$2a$10$5OaNzbR1QJBQMahwZsEkfOGGiETrLbFqfl.rY2.Ur8MPLnhD/DQee', 'AGENT', 1, NOW(), NOW()),
  (4, 'Nina Patel', 'nina.agent@supportdesk.local', '$2a$10$5OaNzbR1QJBQMahwZsEkfOGGiETrLbFqfl.rY2.Ur8MPLnhD/DQee', 'AGENT', 1, NOW(), NOW()),
  (5, 'Olivia Stone', 'olivia.customer@supportdesk.local', '$2a$10$TvcrSt1EpxdAnfHhPvfqXuA03uefQS0zHsZdvaHtTT003CGSHiQXi', 'CUSTOMER', 1, NOW(), NOW()),
  (6, 'Mason Lee', 'mason.customer@supportdesk.local', '$2a$10$TvcrSt1EpxdAnfHhPvfqXuA03uefQS0zHsZdvaHtTT003CGSHiQXi', 'CUSTOMER', 1, NOW(), NOW()),
  (7, 'Priya Shah', 'priya.customer@supportdesk.local', '$2a$10$TvcrSt1EpxdAnfHhPvfqXuA03uefQS0zHsZdvaHtTT003CGSHiQXi', 'CUSTOMER', 1, NOW(), NOW()),
  (8, 'Daniel Kim', 'daniel.customer@supportdesk.local', '$2a$10$TvcrSt1EpxdAnfHhPvfqXuA03uefQS0zHsZdvaHtTT003CGSHiQXi', 'CUSTOMER', 1, NOW(), NOW()),
  (9, 'Sara Gomez', 'sara.customer@supportdesk.local', '$2a$10$TvcrSt1EpxdAnfHhPvfqXuA03uefQS0zHsZdvaHtTT003CGSHiQXi', 'CUSTOMER', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  password_hash=VALUES(password_hash),
  role=VALUES(role),
  is_active=VALUES(is_active);

INSERT INTO categories (id, name, description, is_active, created_at, updated_at)
VALUES
  (1, 'Billing', 'Invoices, refunds, and payment issues', 1, NOW(), NOW()),
  (2, 'Technical Support', 'Software, login, and technical troubleshooting', 1, NOW(), NOW()),
  (3, 'Account Access', 'Password resets, profile issues, account access', 1, NOW(), NOW()),
  (4, 'Shipping', 'Orders, delivery delays, product shipment', 1, NOW(), NOW()),
  (5, 'Product Feedback', 'Feature requests, product feedback, suggestions', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  description=VALUES(description),
  is_active=VALUES(is_active);

INSERT INTO tickets (id, customer_id, assigned_agent_id, category_id, title, description, status, priority, sla_deadline, resolved_at, created_at, updated_at)
VALUES
  (1, 5, 2, 2, 'Cannot login to dashboard', 'The dashboard keeps returning a 500 error after login. I need help urgently.', 'IN_PROGRESS', 'CRITICAL', DATE_SUB(NOW(), INTERVAL 1 HOUR), NULL, DATE_SUB(NOW(), INTERVAL 12 HOUR), NOW()),
  (2, 6, 3, 1, 'Invoice total is incorrect', 'The invoice total charged for my last subscription is higher than expected.', 'OPEN', 'HIGH', DATE_ADD(NOW(), INTERVAL 4 HOUR), NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW()),
  (3, 7, 2, 4, 'Order arrived damaged', 'The package arrived with a broken item and no clear return instructions.', 'WAITING_FOR_CUSTOMER', 'MEDIUM', DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL, DATE_SUB(NOW(), INTERVAL 20 HOUR), NOW()),
  (4, 8, 4, 3, 'Password reset email not received', 'I requested a password reset and have not received the email in over 24 hours.', 'OPEN', 'MEDIUM', DATE_ADD(NOW(), INTERVAL 10 HOUR), NULL, DATE_SUB(NOW(), INTERVAL 6 DAY), NOW()),
  (5, 9, 3, 5, 'Need support for bulk export', 'We need a feature to export data in CSV for monthly reporting.', 'OPEN', 'LOW', DATE_ADD(NOW(), INTERVAL 36 HOUR), NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW()),
  (6, 5, 2, 2, 'Error when exporting reports', 'When I click export, the page freezes and the API times out.', 'RESOLVED', 'HIGH', DATE_SUB(NOW(), INTERVAL 5 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 7 DAY), NOW()),
  (7, 6, 4, 1, 'Refund request for cancelled subscription', 'I cancelled my subscription and want a refund processed quickly.', 'IN_PROGRESS', 'HIGH', DATE_ADD(NOW(), INTERVAL 2 HOUR), NULL, DATE_SUB(NOW(), INTERVAL 9 HOUR), NOW()),
  (8, 7, 3, 4, 'Shipment tracking status not updating', 'Shipment tracker has not changed status in more than 10 days.', 'OPEN', 'MEDIUM', DATE_ADD(NOW(), INTERVAL 12 HOUR), NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW()),
  (9, 8, 2, 2, 'Mobile app crashes on launch', 'The app closes immediately when it starts on Android.', 'CLOSED', 'CRITICAL', DATE_SUB(NOW(), INTERVAL 30 HOUR), DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), NOW()),
  (10, 9, 4, 3, 'Profile update not saving', 'My profile photo and phone number do not persist after saving.', 'OPEN', 'LOW', DATE_ADD(NOW(), INTERVAL 40 HOUR), NULL, DATE_SUB(NOW(), INTERVAL 15 HOUR), NOW()),
  (11, 5, 2, 2, 'API timeout during team sync', 'Our team sync is timing out during high traffic and causing user-facing delays.', 'OPEN', 'CRITICAL', DATE_SUB(NOW(), INTERVAL 3 HOUR), NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW()),
  (12, 6, 3, 1, 'Cannot view old invoice history', 'The platform only shows current invoice and not historical data.', 'RESOLVED', 'MEDIUM', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 5 HOUR), DATE_SUB(NOW(), INTERVAL 6 DAY), NOW())
ON DUPLICATE KEY UPDATE
  assigned_agent_id=VALUES(assigned_agent_id),
  title=VALUES(title),
  description=VALUES(description),
  status=VALUES(status),
  priority=VALUES(priority),
  sla_deadline=VALUES(sla_deadline),
  resolved_at=VALUES(resolved_at),
  updated_at=NOW();

INSERT INTO comments (id, ticket_id, user_id, comment, created_at)
VALUES
  (1, 1, 5, 'The error started right after the latest deploy. Please investigate.', NOW()),
  (2, 1, 2, 'I am looking at the logs and suspect the authentication service.', NOW()),
  (3, 2, 6, 'I need a detailed invoice breakdown before I can confirm the issue.', NOW()),
  (4, 6, 9, 'This was resolved after the billing patch and a cache flush.', NOW()),
  (5, 7, 6, 'I have attached the invoice screenshot and order confirmation.', NOW()),
  (6, 8, 7, 'The package tracking system still shows no update after 10 days.', NOW())
ON DUPLICATE KEY UPDATE
  comment=VALUES(comment);

INSERT INTO ticket_history (id, ticket_id, changed_by, action, old_status, new_status, old_assigned_agent_id, new_assigned_agent_id, description, created_at)
VALUES
  (1, 1, 5, 'CREATED', NULL, 'OPEN', NULL, 2, 'Ticket created by customer.', DATE_SUB(NOW(), INTERVAL 12 HOUR)),
  (2, 1, 2, 'STATUS_CHANGED', 'OPEN', 'IN_PROGRESS', 2, 2, 'Agent started working on the ticket.', DATE_SUB(NOW(), INTERVAL 11 HOUR)),
  (3, 2, 6, 'CREATED', NULL, 'OPEN', NULL, 3, 'Customer submitted billing dispute ticket.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (4, 6, 5, 'CREATED', NULL, 'OPEN', NULL, 2, 'Customer submitted an export issue ticket.', DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (5, 6, 2, 'STATUS_CHANGED', 'OPEN', 'RESOLVED', 2, 2, 'Technical issue fixed and ticket closed by the support agent.', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
  (6, 7, 6, 'CREATED', NULL, 'OPEN', NULL, 4, 'Customer submitted refund request.', DATE_SUB(NOW(), INTERVAL 9 HOUR)),
  (7, 9, 8, 'CREATED', NULL, 'OPEN', NULL, 2, 'Customer raised a mobile app crash issue.', DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (8, 9, 2, 'STATUS_CHANGED', 'OPEN', 'CLOSED', 2, 2, 'Issue investigated and resolved.', DATE_SUB(NOW(), INTERVAL 2 DAY))
ON DUPLICATE KEY UPDATE
  action=VALUES(action),
  description=VALUES(description),
  new_status=VALUES(new_status);
