# SQL examples

## SELECT
```sql
SELECT * FROM tickets WHERE status = 'OPEN';
```

## WHERE
```sql
SELECT * FROM tickets WHERE priority = 'CRITICAL' AND status <> 'CLOSED';
```

## JOIN
```sql
SELECT t.id, c.name AS category_name, u.name AS customer_name
FROM tickets t
JOIN categories c ON c.id = t.category_id
JOIN users u ON u.id = t.customer_id;
```

## LEFT JOIN
```sql
SELECT t.id, a.name AS agent_name
FROM tickets t
LEFT JOIN users a ON a.id = t.assigned_agent_id;
```

## GROUP BY
```sql
SELECT status, COUNT(*) AS total
FROM tickets
GROUP BY status;
```

## HAVING
```sql
SELECT assigned_agent_id, COUNT(*) AS open_count
FROM tickets
WHERE status NOT IN ('RESOLVED', 'CLOSED')
GROUP BY assigned_agent_id
HAVING COUNT(*) > 1;
```

## ORDER BY
```sql
SELECT * FROM tickets ORDER BY created_at DESC LIMIT 10;
```

## COUNT
```sql
SELECT COUNT(*) FROM tickets WHERE status = 'OPEN';
```

## CASE
```sql
SELECT id,
       CASE priority
         WHEN 'CRITICAL' THEN 'Immediate'
         WHEN 'HIGH' THEN 'Priority'
         ELSE 'Standard'
       END AS priority_label
FROM tickets;
```

## Subqueries
```sql
SELECT *
FROM tickets
WHERE customer_id IN (SELECT id FROM users WHERE role = 'CUSTOMER');
```

## INSERT
```sql
INSERT INTO comments (ticket_id, user_id, comment)
VALUES (1, 2, 'Investigating the issue now.');
```

## UPDATE
```sql
UPDATE tickets
SET status = 'IN_PROGRESS', updated_at = NOW()
WHERE id = 12;
```

## DELETE
```sql
UPDATE categories
SET is_active = 0, updated_at = NOW()
WHERE id = 99;
```

## Transactions
```sql
START TRANSACTION;
UPDATE tickets SET status = 'RESOLVED', resolved_at = NOW() WHERE id = 7;
INSERT INTO ticket_history
  (ticket_id, changed_by, action, old_status, new_status, description)
VALUES
  (7, 2, 'STATUS_CHANGED', 'IN_PROGRESS', 'RESOLVED', 'Ticket resolved by agent');
COMMIT;
```
