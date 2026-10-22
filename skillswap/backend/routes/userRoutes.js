/**
 * User Profile Routes
 * Handles student profiles, updating personal info, and viewing peer profiles
 */
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/users/profile
 * Get current logged-in student's full profile with their skills and reviews
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    // 1. Fetch user data
    const [users] = await db.execute(
      'SELECT user_id, name, email, department, year_of_study, bio, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];

    // 2. Fetch user's skills
    const [skills] = await db.execute(
      `SELECT us.user_skill_id, us.skill_id, us.skill_type, us.proficiency_level, us.created_at,
              s.skill_name, s.category, s.description
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.skill_id
       WHERE us.user_id = ?
       ORDER BY us.skill_type ASC, s.skill_name ASC`,
      [userId]
    );

    const offeredSkills = skills.filter(s => s.skill_type === 'OFFER');
    const wantedSkills = skills.filter(s => s.skill_type === 'LEARN');

    // 3. Fetch reviews received
    const [reviews] = await db.execute(
      `SELECT r.review_id, r.rating, r.comment, r.created_at,
              reviewer.user_id AS reviewer_id, reviewer.name AS reviewer_name, reviewer.department AS reviewer_department
       FROM reviews r
       JOIN users reviewer ON r.reviewer_id = reviewer.user_id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    // Calculate average rating
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1)
      : null;

    res.json({
      success: true,
      profile: {
        ...user,
        offeredSkills,
        wantedSkills,
        reviews,
        totalReviews,
        avgRating
      }
    });
  } catch (error) {
    console.error('Error fetching current profile:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving profile' });
  }
});

/**
 * PUT /api/users/profile
 * Update current student's bio, department, and year of study
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    let { name, department, year_of_study, bio } = req.body;

    if (!department || !year_of_study) {
      return res.status(400).json({
        success: false,
        message: 'Department and year of study cannot be empty.'
      });
    }

    department = department.trim();
    year_of_study = year_of_study.trim();
    bio = (bio || '').trim();
    name = (name || req.session.user.name).trim();

    await db.execute(
      `UPDATE users 
       SET name = ?, department = ?, year_of_study = ?, bio = ?
       WHERE user_id = ?`,
      [name, department, year_of_study, bio, userId]
    );

    // Update session
    req.session.user.name = name;
    req.session.user.department = department;
    req.session.user.year_of_study = year_of_study;
    req.session.user.bio = bio;

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: req.session.user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
});

/**
 * GET /api/users/:id
 * Public view of any peer student's profile (skills, reviews, rating)
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    const [users] = await db.execute(
      'SELECT user_id, name, department, year_of_study, bio, created_at FROM users WHERE user_id = ?',
      [targetUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const student = users[0];

    // Fetch student's skills
    const [skills] = await db.execute(
      `SELECT us.user_skill_id, us.skill_id, us.skill_type, us.proficiency_level,
              s.skill_name, s.category, s.description
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.skill_id
       WHERE us.user_id = ?
       ORDER BY us.skill_type ASC, s.skill_name ASC`,
      [targetUserId]
    );

    const offeredSkills = skills.filter(s => s.skill_type === 'OFFER');
    const wantedSkills = skills.filter(s => s.skill_type === 'LEARN');

    // Fetch reviews
    const [reviews] = await db.execute(
      `SELECT r.review_id, r.rating, r.comment, r.created_at,
              reviewer.name AS reviewer_name, reviewer.department AS reviewer_department
       FROM reviews r
       JOIN users reviewer ON r.reviewer_id = reviewer.user_id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_at DESC`,
      [targetUserId]
    );

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1)
      : null;

    res.json({
      success: true,
      student: {
        ...student,
        offeredSkills,
        wantedSkills,
        reviews,
        totalReviews,
        avgRating
      }
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving student profile' });
  }
});

module.exports = router;
