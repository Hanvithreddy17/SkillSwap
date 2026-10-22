/**
 * Exchange Requests Routes
 * Manages sending, accepting, rejecting, and cancelling skill swaps
 */
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/requests/dashboard-summary
 * Aggregates statistics and recent requests for student dashboard
 */
router.get('/dashboard-summary', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    // 1. Count skills offered & wanted
    const [skillCounts] = await db.execute(
      `SELECT skill_type, COUNT(*) AS count 
       FROM user_skills 
       WHERE user_id = ? 
       GROUP BY skill_type`,
      [userId]
    );

    let offeredCount = 0;
    let wantedCount = 0;
    skillCounts.forEach(row => {
      if (row.skill_type === 'OFFER') offeredCount = row.count;
      if (row.skill_type === 'LEARN') wantedCount = row.count;
    });

    // 2. Count pending requests (incoming + outgoing pending)
    const [pendingRows] = await db.execute(
      `SELECT COUNT(*) AS count 
       FROM exchange_requests 
       WHERE (recipient_id = ? OR requester_id = ?) AND status = 'Pending'`,
      [userId, userId]
    );
    const pendingCount = pendingRows[0].count;

    // 3. Count accepted exchanges
    const [acceptedRows] = await db.execute(
      `SELECT COUNT(*) AS count 
       FROM exchange_requests 
       WHERE (recipient_id = ? OR requester_id = ?) AND status = 'Accepted'`,
      [userId, userId]
    );
    const acceptedCount = acceptedRows[0].count;

    // 4. Fetch recent incoming requests (up to 5)
    const [recentIncoming] = await db.execute(
      `SELECT 
        er.request_id,
        er.status,
        er.message,
        er.created_at,
        requester.user_id AS requester_id,
        requester.name AS requester_name,
        requester.department AS requester_department,
        requester.year_of_study AS requester_year,
        s_offered.skill_name AS offered_skill_name,
        s_requested.skill_name AS requested_skill_name
      FROM exchange_requests er
      JOIN users requester ON er.requester_id = requester.user_id
      JOIN user_skills us_offered ON er.offered_skill_id = us_offered.user_skill_id
      JOIN skills s_offered ON us_offered.skill_id = s_offered.skill_id
      JOIN user_skills us_requested ON er.requested_skill_id = us_requested.user_skill_id
      JOIN skills s_requested ON us_requested.skill_id = s_requested.skill_id
      WHERE er.recipient_id = ?
      ORDER BY er.created_at DESC
      LIMIT 5`,
      [userId]
    );

    res.json({
      success: true,
      summary: {
        offeredCount,
        wantedCount,
        pendingCount,
        acceptedCount,
        recentIncoming
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving dashboard metrics' });
  }
});

/**
 * POST /api/requests
 * Send a skill exchange request
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const requesterId = req.session.user.user_id;
    let { recipient_id, requested_skill_id, offered_skill_id, message } = req.body;

    recipient_id = parseInt(recipient_id, 10);
    requested_skill_id = parseInt(requested_skill_id, 10);
    offered_skill_id = parseInt(offered_skill_id, 10);
    message = (message || '').trim();

    if (!recipient_id || !requested_skill_id || !offered_skill_id) {
      return res.status(400).json({
        success: false,
        message: 'Recipient, requested skill, and offered skill are required.'
      });
    }

    // Rule: Prevent users from sending requests to themselves
    if (requesterId === recipient_id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send an exchange request to yourself.'
      });
    }

    // Rule: Validate requester's offered skill ownership and type
    const [offeredRows] = await db.execute(
      `SELECT user_skill_id, user_id, skill_type 
       FROM user_skills 
       WHERE user_skill_id = ?`,
      [offered_skill_id]
    );

    if (offeredRows.length === 0 || offeredRows[0].user_id !== requesterId || offeredRows[0].skill_type !== 'OFFER') {
      return res.status(400).json({
        success: false,
        message: 'The offered skill must be one of your own active OFFER skills.'
      });
    }

    // Rule: Validate recipient's requested skill ownership and type
    const [requestedRows] = await db.execute(
      `SELECT user_skill_id, user_id, skill_type 
       FROM user_skills 
       WHERE user_skill_id = ?`,
      [requested_skill_id]
    );

    if (requestedRows.length === 0 || requestedRows[0].user_id !== recipient_id || requestedRows[0].skill_type !== 'OFFER') {
      return res.status(400).json({
        success: false,
        message: 'The requested skill must belong to the recipient and be offered by them.'
      });
    }

    // Rule: Prevent duplicate active requests for the same exchange
    const [existingRequests] = await db.execute(
      `SELECT request_id, status FROM exchange_requests
       WHERE requester_id = ? AND recipient_id = ? 
         AND requested_skill_id = ? AND offered_skill_id = ?
         AND status IN ('Pending', 'Accepted')`,
      [requesterId, recipient_id, requested_skill_id, offered_skill_id]
    );

    if (existingRequests.length > 0) {
      return res.status(409).json({
        success: false,
        message: `An active request (${existingRequests[0].status}) already exists between you for this exact exchange.`
      });
    }

    // Insert request
    const [insertResult] = await db.execute(
      `INSERT INTO exchange_requests 
        (requester_id, recipient_id, requested_skill_id, offered_skill_id, message, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [requesterId, recipient_id, requested_skill_id, offered_skill_id, message]
    );

    res.status(201).json({
      success: true,
      message: 'Exchange request sent successfully!',
      request_id: insertResult.insertId
    });
  } catch (error) {
    console.error('Error creating exchange request:', error);
    res.status(500).json({ success: false, message: 'Server error creating request' });
  }
});

/**
 * GET /api/requests/incoming
 * View requests received by the current student
 */
router.get('/incoming', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const [rows] = await db.execute(
      `SELECT 
        er.request_id,
        er.status,
        er.message,
        er.created_at,
        er.updated_at,
        requester.user_id AS requester_id,
        requester.name AS requester_name,
        requester.email AS requester_email,
        requester.department AS requester_department,
        requester.year_of_study AS requester_year,
        requester.bio AS requester_bio,

        -- Skill the requester wants from current user:
        s_requested.skill_name AS requested_skill_name,
        s_requested.category AS requested_skill_category,
        us_requested.proficiency_level AS my_offered_proficiency,

        -- Skill the requester offers in return:
        s_offered.skill_name AS offered_skill_name,
        s_offered.category AS offered_skill_category,
        us_offered.proficiency_level AS peer_offered_proficiency
      FROM exchange_requests er
      JOIN users requester ON er.requester_id = requester.user_id
      JOIN user_skills us_requested ON er.requested_skill_id = us_requested.user_skill_id
      JOIN skills s_requested ON us_requested.skill_id = s_requested.skill_id
      JOIN user_skills us_offered ON er.offered_skill_id = us_offered.user_skill_id
      JOIN skills s_offered ON us_offered.skill_id = s_offered.skill_id
      WHERE er.recipient_id = ?
      ORDER BY er.created_at DESC`,
      [userId]
    );

    res.json({ success: true, requests: rows });
  } catch (error) {
    console.error('Error fetching incoming requests:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving incoming requests' });
  }
});

/**
 * GET /api/requests/outgoing
 * View requests sent by the current student
 */
router.get('/outgoing', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const [rows] = await db.execute(
      `SELECT 
        er.request_id,
        er.status,
        er.message,
        er.created_at,
        er.updated_at,
        recipient.user_id AS recipient_id,
        recipient.name AS recipient_name,
        recipient.email AS recipient_email,
        recipient.department AS recipient_department,
        recipient.year_of_study AS recipient_year,

        -- Skill requested from recipient:
        s_requested.skill_name AS requested_skill_name,
        s_requested.category AS requested_skill_category,
        us_requested.proficiency_level AS peer_offered_proficiency,

        -- Skill offered by current user in return:
        s_offered.skill_name AS offered_skill_name,
        s_offered.category AS offered_skill_category,
        us_offered.proficiency_level AS my_offered_proficiency
      FROM exchange_requests er
      JOIN users recipient ON er.recipient_id = recipient.user_id
      JOIN user_skills us_requested ON er.requested_skill_id = us_requested.user_skill_id
      JOIN skills s_requested ON us_requested.skill_id = s_requested.skill_id
      JOIN user_skills us_offered ON er.offered_skill_id = us_offered.user_skill_id
      JOIN skills s_offered ON us_offered.skill_id = s_offered.skill_id
      WHERE er.requester_id = ?
      ORDER BY er.created_at DESC`,
      [userId]
    );

    res.json({ success: true, requests: rows });
  } catch (error) {
    console.error('Error fetching outgoing requests:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving outgoing requests' });
  }
});

/**
 * GET /api/requests/accepted
 * Get all accepted exchange requests involving the current student
 * (Used to populate the "Schedule Session" exchange picker)
 */
router.get('/accepted', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const [rows] = await db.execute(
      `SELECT 
        er.request_id,
        er.requester_id,
        er.recipient_id,
        IF(er.requester_id = ?, recipient.name, requester.name) AS partner_name,
        IF(er.requester_id = ?, recipient.department, requester.department) AS partner_department,
        IF(er.requester_id = ?, recipient.email, requester.email) AS partner_email,
        s_requested.skill_name AS requested_skill_name,
        s_offered.skill_name AS offered_skill_name
      FROM exchange_requests er
      JOIN users requester ON er.requester_id = requester.user_id
      JOIN users recipient ON er.recipient_id = recipient.user_id
      JOIN user_skills us_requested ON er.requested_skill_id = us_requested.user_skill_id
      JOIN skills s_requested ON us_requested.skill_id = s_requested.skill_id
      JOIN user_skills us_offered ON er.offered_skill_id = us_offered.user_skill_id
      JOIN skills s_offered ON us_offered.skill_id = s_offered.skill_id
      WHERE (er.requester_id = ? OR er.recipient_id = ?) 
        AND er.status = 'Accepted'
      ORDER BY er.updated_at DESC`,
      [userId, userId, userId, userId, userId]
    );

    res.json({ success: true, exchanges: rows });
  } catch (error) {
    console.error('Error fetching accepted exchanges:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving accepted exchanges' });
  }
});

/**
 * PUT /api/requests/:id/status
 * Update request status:
 * - Recipient can Accept or Reject
 * - Requester can Cancel
 */
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const requestId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const validStatuses = ['Accepted', 'Rejected', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be Accepted, Rejected, or Cancelled.'
      });
    }

    // Fetch request
    const [rows] = await db.execute(
      'SELECT request_id, requester_id, recipient_id, status FROM exchange_requests WHERE request_id = ?',
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Exchange request not found.' });
    }

    const request = rows[0];

    // Cannot modify non-pending requests
    if (request.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `This request is already marked as ${request.status} and cannot be modified.`
      });
    }

    // Permission checks:
    // Only recipient can Accept or Reject
    if (status === 'Accepted' || status === 'Rejected') {
      if (request.recipient_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the recipient of this request can Accept or Reject it.'
        });
      }
    }

    // Only requester can Cancel
    if (status === 'Cancelled') {
      if (request.requester_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the sender of this request can Cancel it.'
        });
      }
    }

    await db.execute(
      'UPDATE exchange_requests SET status = ? WHERE request_id = ?',
      [status, requestId]
    );

    res.json({
      success: true,
      message: `Exchange request successfully ${status.toLowerCase()}!`
    });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ success: false, message: 'Server error updating request' });
  }
});

module.exports = router;
