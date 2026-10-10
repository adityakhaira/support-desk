require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');

const port = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be configured before starting the server.');
    }
    await pool.query('SELECT 1');
    app.listen(port, () => {
      console.log(`SupportDesk backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('SupportDesk startup failed:', error.message);
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
