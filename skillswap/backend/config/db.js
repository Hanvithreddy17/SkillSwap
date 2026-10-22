/**
 * Database Connection Module
 * Uses mysql2/promise connection pool for reliable, parameterized queries
 */
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'skillswap',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL database "${process.env.DB_NAME || 'skillswap'}" on port ${process.env.DB_PORT || 3306}`);
    connection.release();
  } catch (error) {
    console.error('[Database Error] Failed to connect to MySQL:', error.message);
    console.error('[Troubleshooting] Please check if MySQL server is running and .env credentials are correct.');
  }
})();

module.exports = pool;
