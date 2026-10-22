/**
 * SkillSwap — Student Skill Exchange Platform
 * Main Express Server
 */
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration
dotenv.config({ path: path.join(__dirname, '.env') });

const db = require('./config/db');
const { ensureCsrfToken, verifyCsrf } = require('./middleware/auth');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const skillRoutes = require('./routes/skillRoutes');
const matchRoutes = require('./routes/matchRoutes');
const requestRoutes = require('./routes/requestRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration (allow credentials for session cookies)
app.use(cors({
  origin: true,
  credentials: true
}));

// Session Configuration
app.use(session({
  name: 'skillswap.sid',
  secret: process.env.SESSION_SECRET || 'skillswap_dev_session_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax'
  }
}));

// CSRF Protection Middleware
app.use(ensureCsrfToken);
app.use(verifyCsrf);

// Serve Frontend Static Files (Single Origin)
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Mount REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SkillSwap Backend', timestamp: new Date() });
});

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.'
  });
});

// Start listening
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(` SkillSwap Server is running successfully!`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Static Frontend: ${frontendPath}`);
  console.log('====================================================');
});
