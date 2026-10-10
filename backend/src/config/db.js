const mysql = require('mysql2/promise');

const config = {
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
  config.password = process.env.DB_PASSWORD;
}

const pool = mysql.createPool(config);

module.exports = pool;
