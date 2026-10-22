
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

router.get('/reciprocal', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.user_id;

    // 1. Check if current user has both offered and wanted skills
    const [userSkills] = await db.execute(
      'SELECT skill_type FROM user_skills WHERE user_id = ?',
      [currentUserId]
    );

    const hasOffer = userSkills.some(s => s.skill_type === 'OFFER');
    const hasLearn = userSkills.some(s => s.skill_type === 'LEARN');

    if (!hasOffer || !hasLearn) {
      return res.json({
        success: true,
        matches: [],
        hasRequirements: false,
        message: 'To discover reciprocal matches, make sure you have added at least one skill you can teach (Offer) and one skill you want to learn (Wanted).'
      });
    }

    // 2. Query reciprocal matching pairs using parameterized SQL
    const matchQuery = `
      SELECT 
        u.user_id AS peer_id,
        u.name AS peer_name,
        u.department AS peer_department,
        u.year_of_study AS peer_year,
        u.bio AS peer_bio,

        -- What peer can teach you (Peer OFFERS, You LEARN):
        b_offer.user_skill_id AS peer_offered_user_skill_id,
        b_offer.proficiency_level AS peer_proficiency,
        s_learn.skill_id AS teach_you_skill_id,
        s_learn.skill_name AS teach_you_skill_name,
        s_learn.category AS teach_you_category,

        -- What you can teach peer (You OFFER, Peer LEARNS):
        a_offer.user_skill_id AS my_offered_user_skill_id,
        a_offer.proficiency_level AS my_proficiency,
        s_teach.skill_id AS you_teach_skill_id,
        s_teach.skill_name AS you_teach_skill_name,
        s_teach.category AS you_teach_category
      FROM user_skills a_learn
      -- Match peer B who offers what student A wants to learn:
      JOIN user_skills b_offer ON b_offer.skill_id = a_learn.skill_id 
                              AND b_offer.skill_type = 'OFFER' 
                              AND b_offer.user_id != ?
      JOIN skills s_learn ON b_offer.skill_id = s_learn.skill_id
      JOIN users u ON b_offer.user_id = u.user_id
      -- Match peer B who wants to learn what student A offers:
      JOIN user_skills b_learn ON b_learn.user_id = u.user_id 
                              AND b_learn.skill_type = 'LEARN'
      JOIN user_skills a_offer ON a_offer.skill_id = b_learn.skill_id 
                              AND a_offer.skill_type = 'OFFER' 
                              AND a_offer.user_id = ?
      JOIN skills s_teach ON a_offer.skill_id = s_teach.skill_id
      WHERE a_learn.user_id = ? 
        AND a_learn.skill_type = 'LEARN'
      ORDER BY u.name ASC
    `;

    const [rows] = await db.execute(matchQuery, [currentUserId, currentUserId, currentUserId]);

    // 3. For each match, check if there is already an existing exchange request
    const matchesWithStatus = await Promise.all(
      rows.map(async match => {
        const [existingReq] = await db.execute(
          `SELECT request_id, requester_id, status FROM exchange_requests
           WHERE ((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?))
             AND requested_skill_id = ? AND offered_skill_id = ?`,
          [
            currentUserId, match.peer_id, match.peer_id, currentUserId,
            match.peer_offered_user_skill_id, match.my_offered_user_skill_id
          ]
        );

        let requestStatus = null;
        let existingRequestId = null;
        let isMySentRequest = false;

        if (existingReq.length > 0) {
          requestStatus = existingReq[0].status;
          existingRequestId = existingReq[0].request_id;
          isMySentRequest = existingReq[0].requester_id === currentUserId;
        }

        return {
          ...match,
          requestStatus,
          existingRequestId,
          isMySentRequest
        };
      })
    );

    res.json({
      success: true,
      hasRequirements: true,
      count: matchesWithStatus.length,
      matches: matchesWithStatus
    });
  } catch (error) {
    console.error('Error finding reciprocal matches:', error);
    res.status(500).json({ success: false, message: 'Server error calculating matches' });
  }
});

module.exports = router;
