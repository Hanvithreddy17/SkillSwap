/**
 * Study Session Routes
 * Handles scheduling, viewing, and completing peer exchange sessions
 */
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/sessions
 * Schedule a new session for an accepted exchange
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    let { request_id, scheduled_at, duration_minutes, meeting_mode, meeting_details } = req.body;

    request_id = parseInt(request_id, 10);
    duration_minutes = parseInt(duration_minutes, 10) || 60;
    meeting_details = (meeting_details || '').trim();

    if (!request_id || !scheduled_at || !meeting_mode) {
      return res.status(400).json({
        success: false,
        message: 'Exchange request, scheduled date/time, and meeting mode are required.'
      });
    }

    if (!['Online', 'In Person'].includes(meeting_mode)) {
      return res.status(400).json({
        success: false,
        message: 'Meeting mode must be "Online" or "In Person".'
      });
    }

    // Verify exchange request exists and is Accepted
    const [requests] = await db.execute(
      'SELECT request_id, requester_id, recipient_id, status FROM exchange_requests WHERE request_id = ?',
      [request_id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Exchange request not found.' });
    }

    const exchange = requests[0];

    if (exchange.status !== 'Accepted') {
      return res.status(400).json({
        success: false,
        message: 'Sessions can only be scheduled for accepted exchange requests.'
      });
    }

    // Ensure user is part of this exchange
    if (exchange.requester_id !== userId && exchange.recipient_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this exchange request.'
      });
    }

    // Format scheduled_at for MySQL DATETIME
    const dateObj = new Date(scheduled_at);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid date and time.'
      });
    }

    const mysqlDatetime = dateObj.toISOString().slice(0, 19).replace('T', ' ');

    const [insertResult] = await db.execute(
      `INSERT INTO sessions 
        (request_id, scheduled_at, duration_minutes, meeting_mode, meeting_details, status)
       VALUES (?, ?, ?, ?, ?, 'Scheduled')`,
      [request_id, mysqlDatetime, duration_minutes, meeting_mode, meeting_details]
    );

    res.status(201).json({
      success: true,
      message: 'Study session scheduled successfully!',
      session_id: insertResult.insertId
    });
  } catch (error) {
    console.error('Error creating study session:', error);
    res.status(500).json({ success: false, message: 'Server error scheduling session' });
  }
});

/**
 * GET /api/sessions/my
 * View upcoming, completed, and cancelled sessions for current student
 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const [rows] = await db.execute(
      `SELECT 
        s.session_id,
        s.request_id,
        s.scheduled_at,
        s.duration_minutes,
        s.meeting_mode,
        s.meeting_details,
        s.status,
        s.created_at,
        er.requester_id,
        er.recipient_id,
        IF(er.requester_id = ?, recipient.user_id, requester.user_id) AS partner_id,
        IF(er.requester_id = ?, recipient.name, requester.name) AS partner_name,
        IF(er.requester_id = ?, recipient.email, requester.email) AS partner_email,
        IF(er.requester_id = ?, recipient.department, requester.department) AS partner_department,
        s_requested.skill_name AS requested_skill_name,
        s_offered.skill_name AS offered_skill_name,

        -- Check if current user has already submitted a review for this session
        (SELECT COUNT(*) FROM reviews r WHERE r.session_id = s.session_id AND r.reviewer_id = ?) AS has_reviewed
      FROM sessions s
      JOIN exchange_requests er ON s.request_id = er.request_id
      JOIN users requester ON er.requester_id = requester.user_id
      JOIN users recipient ON er.recipient_id = recipient.user_id
      JOIN user_skills us_requested ON er.requested_skill_id = us_requested.user_skill_id
      JOIN skills s_requested ON us_requested.skill_id = s_requested.skill_id
      JOIN user_skills us_offered ON er.offered_skill_id = us_offered.user_skill_id
      JOIN skills s_offered ON us_offered.skill_id = s_offered.skill_id
      WHERE er.requester_id = ? OR er.recipient_id = ?
      ORDER BY s.scheduled_at DESC`,
      [userId, userId, userId, userId, userId, userId, userId]
    );

    res.json({ success: true, sessions: rows });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving sessions' });
  }
});

/**
 * PUT /api/sessions/:id/status
 * Mark a session as Completed or Cancelled
 */
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const sessionId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!['Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status can only be updated to Completed or Cancelled.'
      });
    }

    // Verify session and participation
    const [rows] = await db.execute(
      `SELECT s.session_id, s.status, er.requester_id, er.recipient_id
       FROM sessions s
       JOIN exchange_requests er ON s.request_id = er.request_id
       WHERE s.session_id = ?`,
      [sessionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const session = rows[0];

    if (session.requester_id !== userId && session.recipient_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this session.'
      });
    }

    await db.execute(
      'UPDATE sessions SET status = ? WHERE session_id = ?',
      [status, sessionId]
    );

    res.json({
      success: true,
      message: `Session has been marked as ${status}!`
    });
  } catch (error) {
    console.error('Error updating session status:', error);
    res.status(500).json({ success: false, message: 'Server error updating session' });
  }
});

module.exports = router;
