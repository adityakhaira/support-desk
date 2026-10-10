require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function seed() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'supportdesk',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  };

  if (process.env.DB_PASSWORD) {
    dbConfig.password = process.env.DB_PASSWORD;
  }

  const pool = mysql.createPool(dbConfig);
  const seedDir = path.join(__dirname, '..', '..', 'database', 'seeds');
  const files = fs.readdirSync(seedDir).sort();

  for (const file of files) {
    const filePath = path.join(seedDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = sql.split(';').map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) {
      await pool.query(`${statement};`);
    }
    console.log(`Seeded: ${file}`);
  }

  await pool.end();
}

seed().catch((error) => {
  console.error('Seeding failed:', error.message);
  process.exit(1);
});
