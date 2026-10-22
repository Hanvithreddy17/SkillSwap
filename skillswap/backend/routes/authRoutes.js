/**
 * Authentication Routes
 * Handles student registration, login, logout, and session check
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

/**
 * GET /api/auth/csrf-token
 * Returns the current session's CSRF token for the frontend
 */
router.get('/csrf-token', (req, res) => {
  res.json({
    success: true,
    csrfToken: req.session.csrfToken
  });
});

/**
 * GET /api/auth/me
 * Returns currently logged-in user profile or null
 */
router.get('/me', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({
      success: true,
      authenticated: false,
      user: null,
      csrfToken: req.session ? req.session.csrfToken : null
    });
  }

  try {
    const [rows] = await db.execute(
      'SELECT user_id, name, email, department, year_of_study, bio, created_at FROM users WHERE user_id = ?',
      [req.session.user.user_id]
    );

    if (rows.length === 0) {
      req.session.destroy();
      return res.json({
        success: true,
        authenticated: false,
        user: null
      });
    }

    const user = rows[0];
    req.session.user = user; // keep updated

    res.json({
      success: true,
      authenticated: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        department: user.department,
        year_of_study: user.year_of_study,
        bio: user.bio,
        created_at: user.created_at
      },
      csrfToken: req.session.csrfToken
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving user data' });
  }
});

/**
 * POST /api/auth/register
 * Student Registration
 */
router.post('/register', async (req, res) => {
  try {
    let { name, email, password, department, year_of_study, bio } = req.body;

    // 1. Basic validation
    if (!name || !email || !password || !department || !year_of_study) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, department, and year of study are required.'
      });
    }

    name = name.trim();
    email = email.trim().toLowerCase();
    department = department.trim();
    year_of_study = year_of_study.trim();
    bio = (bio || '').trim();

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // 2. Check for duplicate email
    const [existing] = await db.execute(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in.'
      });
    }

    // 3. Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 4. Insert into database
    const [result] = await db.execute(
      `INSERT INTO users (name, email, password_hash, department, year_of_study, bio) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, password_hash, department, year_of_study, bio]
    );

    const newUser = {
      user_id: result.insertId,
      name,
      email,
      department,
      year_of_study,
      bio
    };

    // 5. Establish session
    req.session.user = newUser;

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to SkillSwap.',
      user: newUser,
      csrfToken: req.session.csrfToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred during registration. Please try again.'
    });
  }
});

/**
 * POST /api/auth/login
 * Student Login
 */
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    email = email.trim().toLowerCase();

    // Query user by email
    const [rows] = await db.execute(
      'SELECT user_id, name, email, password_hash, department, year_of_study, bio FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = rows[0];

    // Verify password hash
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Set session user
    const sessionUserData = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      department: user.department,
      year_of_study: user.year_of_study,
      bio: user.bio
    };
    req.session.user = sessionUserData;

    res.json({
      success: true,
      message: 'Login successful!',
      user: sessionUserData,
      csrfToken: req.session.csrfToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred during login. Please try again.'
    });
  }
});

/**
 * POST /api/auth/logout
 * Destroys session
 */
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, message: 'Could not log out, please try again.' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

module.exports = router;
