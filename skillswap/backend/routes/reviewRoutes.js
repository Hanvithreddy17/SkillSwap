/**
 * Review Routes
 * Handles submitting ratings (1-5 stars) and peer feedback after completed sessions
 */
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/reviews
 * Submit a review and rating for a completed session partner
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const reviewerId = req.session.user.user_id;
    let { session_id, rating, comment } = req.body;

    session_id = parseInt(session_id, 10);
    rating = parseInt(rating, 10);
    comment = (comment || '').trim();

    if (!session_id || isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Valid session ID and a rating between 1 and 5 stars are required.'
      });
    }

    // Verify session exists and is Completed
    const [sessions] = await db.execute(
      `SELECT s.session_id, s.status, er.requester_id, er.recipient_id 
       FROM sessions s
       JOIN exchange_requests er ON s.request_id = er.request_id
       WHERE s.session_id = ?`,
      [session_id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Study session not found.' });
    }

    const session = sessions[0];

    if (session.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be submitted for completed study sessions.'
      });
    }

    // Verify participation and determine reviewee
    let revieweeId = null;
    if (session.requester_id === reviewerId) {
      revieweeId = session.recipient_id;
    } else if (session.recipient_id === reviewerId) {
      revieweeId = session.requester_id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this study session.'
      });
    }

    // Prevent duplicate reviews for the same session
    const [existing] = await db.execute(
      'SELECT review_id FROM reviews WHERE session_id = ? AND reviewer_id = ?',
      [session_id, reviewerId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a review for this session.'
      });
    }

    // Insert review
    const [insertResult] = await db.execute(
      'INSERT INTO reviews (session_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [session_id, reviewerId, revieweeId, rating, comment]
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully! Thank you for encouraging peer learning.',
      review_id: insertResult.insertId
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ success: false, message: 'Server error submitting review' });
  }
});

/**
 * GET /api/reviews/user/:userId
 * Get all reviews received by a particular student
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    const [reviews] = await db.execute(
      `SELECT 
        r.review_id,
        r.session_id,
        r.rating,
        r.comment,
        r.created_at,
        reviewer.user_id AS reviewer_id,
        reviewer.name AS reviewer_name,
        reviewer.department AS reviewer_department
       FROM reviews r
       JOIN users reviewer ON r.reviewer_id = reviewer.user_id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_at DESC`,
      [targetUserId]
    );

    const total = reviews.length;
    const avg = total > 0
      ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / total).toFixed(1)
      : null;

    res.json({
      success: true,
      total,
      avgRating: avg,
      reviews
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving reviews' });
  }
});

module.exports = router;
