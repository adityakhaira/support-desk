require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root'
  };

  if (process.env.DB_PASSWORD) {
    dbConfig.password = process.env.DB_PASSWORD;
  }

  const database = process.env.DB_NAME || 'supportdesk';
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error('DB_NAME may contain only letters, numbers, and underscores.');
  }
  const migrationDir = path.join(__dirname, '..', '..', 'database', 'migrations');

  const rootConnection = await mysql.createConnection(dbConfig);
  await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await rootConnection.end();

  const pool = mysql.createPool({
    ...dbConfig,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  });

  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  const files = fs.readdirSync(migrationDir).sort();
  for (const file of files) {
    const [appliedRows] = await pool.query(
      'SELECT migration_name FROM schema_migrations WHERE migration_name = ?',
      [file]
    );
    if (appliedRows.length) {
      continue;
    }

    const filePath = path.join(migrationDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = sql.split(';').map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) {
      await pool.query(`${statement};`);
    }
    await pool.query('INSERT INTO schema_migrations (migration_name) VALUES (?)', [file]);
    console.log(`Applied migration: ${file}`);
  }

  await pool.end();
}

run().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
