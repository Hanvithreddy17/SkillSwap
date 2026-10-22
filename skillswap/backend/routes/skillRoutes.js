/**
 * Skill Management & Catalog Routes
 * Handles skill listing, adding/removing user skills, and exploring peer offerings
 */
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/skills/catalog
 * Get all available predefined skills in the catalog
 */
router.get('/catalog', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT skill_id, skill_name, category, description FROM skills';
    const params = [];

    if (category && category !== 'All') {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY category ASC, skill_name ASC';

    const [rows] = await db.execute(query, params);
    res.json({ success: true, skills: rows });
  } catch (error) {
    console.error('Error fetching skills catalog:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving skills' });
  }
});

/**
 * POST /api/skills/catalog
 * Add a new custom skill to the master catalog if it doesn't already exist
 */
router.post('/catalog', requireAuth, async (req, res) => {
  try {
    let { skill_name, category, description } = req.body;

    if (!skill_name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Skill name and category are required.'
      });
    }

    skill_name = skill_name.trim();
    category = category.trim();
    description = (description || '').trim();

    // Check if skill already exists
    const [existing] = await db.execute(
      'SELECT skill_id, skill_name, category FROM skills WHERE LOWER(skill_name) = LOWER(?)',
      [skill_name]
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'Skill already exists in catalog.',
        skill: existing[0]
      });
    }

    const [result] = await db.execute(
      'INSERT INTO skills (skill_name, category, description) VALUES (?, ?, ?)',
      [skill_name, category, description]
    );

    res.status(201).json({
      success: true,
      message: 'New skill added to catalog!',
      skill: {
        skill_id: result.insertId,
        skill_name,
        category,
        description
      }
    });
  } catch (error) {
    console.error('Error creating custom skill:', error);
    res.status(500).json({ success: false, message: 'Server error adding skill' });
  }
});

/**
 * GET /api/skills/my
 * Get current logged-in user's offered and wanted skills
 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const [rows] = await db.execute(
      `SELECT us.user_skill_id, us.skill_id, us.skill_type, us.proficiency_level, us.created_at,
              s.skill_name, s.category, s.description
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.skill_id
       WHERE us.user_id = ?
       ORDER BY us.skill_type ASC, s.skill_name ASC`,
      [userId]
    );

    const offered = rows.filter(r => r.skill_type === 'OFFER');
    const wanted = rows.filter(r => r.skill_type === 'LEARN');

    res.json({
      success: true,
      offered,
      wanted,
      all: rows
    });
  } catch (error) {
    console.error('Error fetching user skills:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving user skills' });
  }
});

/**
 * POST /api/skills/my
 * Add a skill to the logged-in user's profile (either OFFER or LEARN)
 */
router.post('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    let { skill_id, custom_skill_name, category, skill_type, proficiency_level, description } = req.body;

    // Validate type and proficiency
    const validTypes = ['OFFER', 'LEARN'];
    const validLevels = ['Beginner', 'Intermediate', 'Advanced'];

    if (!validTypes.includes(skill_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid skill type. Must be OFFER or LEARN.'
      });
    }

    if (!validLevels.includes(proficiency_level)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid proficiency level. Must be Beginner, Intermediate, or Advanced.'
      });
    }

    // If student provided a custom skill name
    if (!skill_id && custom_skill_name) {
      custom_skill_name = custom_skill_name.trim();
      const cat = (category || 'Other').trim();

      const [existing] = await db.execute(
        'SELECT skill_id FROM skills WHERE LOWER(skill_name) = LOWER(?)',
        [custom_skill_name]
      );

      if (existing.length > 0) {
        skill_id = existing[0].skill_id;
      } else {
        const [insertResult] = await db.execute(
          'INSERT INTO skills (skill_name, category, description) VALUES (?, ?, ?)',
          [custom_skill_name, cat, description || '']
        );
        skill_id = insertResult.insertId;
      }
    }

    if (!skill_id) {
      return res.status(400).json({
        success: false,
        message: 'Please select a skill or provide a custom skill name.'
      });
    }

    // Check duplicate entry for same user, skill, and skill_type
    const [existingUserSkill] = await db.execute(
      'SELECT user_skill_id FROM user_skills WHERE user_id = ? AND skill_id = ? AND skill_type = ?',
      [userId, skill_id, skill_type]
    );

    if (existingUserSkill.length > 0) {
      return res.status(409).json({
        success: false,
        message: `You already have this skill listed in your ${skill_type === 'OFFER' ? 'Offered' : 'Wanted'} skills.`
      });
    }

    // Insert user skill
    const [result] = await db.execute(
      'INSERT INTO user_skills (user_id, skill_id, skill_type, proficiency_level) VALUES (?, ?, ?, ?)',
      [userId, skill_id, skill_type, proficiency_level]
    );

    res.status(201).json({
      success: true,
      message: `Skill successfully added to your ${skill_type === 'OFFER' ? 'offered' : 'wanted'} list!`,
      user_skill_id: result.insertId
    });
  } catch (error) {
    console.error('Error adding user skill:', error);
    res.status(500).json({ success: false, message: 'Server error saving skill' });
  }
});

/**
 * DELETE /api/skills/my/:id
 * Remove a skill entry belonging to the logged-in user
 */
router.delete('/my/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const userSkillId = parseInt(req.params.id, 10);

    if (isNaN(userSkillId)) {
      return res.status(400).json({ success: false, message: 'Invalid skill entry ID' });
    }

    // Verify ownership
    const [entries] = await db.execute(
      'SELECT user_skill_id, skill_type FROM user_skills WHERE user_skill_id = ? AND user_id = ?',
      [userSkillId, userId]
    );

    if (entries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Skill entry not found or you do not have permission to delete it.'
      });
    }

    // Check if this skill is referenced in any active exchange requests
    const [activeRequests] = await db.execute(
      `SELECT request_id, status FROM exchange_requests 
       WHERE (requested_skill_id = ? OR offered_skill_id = ?) 
       AND status IN ('Pending', 'Accepted')`,
      [userSkillId, userSkillId]
    );

    if (activeRequests.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove this skill because it is linked to an active (Pending or Accepted) exchange request. Please resolve or cancel the request first.'
      });
    }

    // Delete the entry
    await db.execute(
      'DELETE FROM user_skills WHERE user_skill_id = ? AND user_id = ?',
      [userSkillId, userId]
    );

    res.json({
      success: true,
      message: 'Skill removed successfully from your profile.'
    });
  } catch (error) {
    console.error('Error deleting user skill:', error);
    res.status(500).json({ success: false, message: 'Server error deleting skill' });
  }
});

/**
 * GET /api/skills/explore
 * Browse skills offered by other students with search & category filters
 */
router.get('/explore', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.user_id;
    const { search, category, proficiency } = req.query;

    let query = `
      SELECT 
        us.user_skill_id,
        us.user_id,
        us.proficiency_level,
        us.created_at,
        u.name AS student_name,
        u.department,
        u.year_of_study,
        u.bio,
        s.skill_id,
        s.skill_name,
        s.category,
        s.description
      FROM user_skills us
      JOIN users u ON us.user_id = u.user_id
      JOIN skills s ON us.skill_id = s.skill_id
      WHERE us.skill_type = 'OFFER'
        AND us.user_id != ?
    `;

    const params = [currentUserId];

    // Filter by search query (skill name or student name or department)
    if (search && search.trim() !== '') {
      query += ` AND (s.skill_name LIKE ? OR u.name LIKE ? OR s.description LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // Filter by category
    if (category && category !== 'All') {
      query += ` AND s.category = ?`;
      params.push(category);
    }

    // Filter by proficiency level
    if (proficiency && proficiency !== 'All') {
      query += ` AND us.proficiency_level = ?`;
      params.push(proficiency);
    }

    query += ` ORDER BY us.created_at DESC`;

    const [listings] = await db.execute(query, params);

    // Also fetch what skills each of these students want to learn, so we can display:
    // "Looking to learn: Python, DaVinci Resolve"
    if (listings.length > 0) {
      const userIds = [...new Set(listings.map(l => l.user_id))];
      // Generate placeholders
      const placeholders = userIds.map(() => '?').join(',');
      const [wantedRows] = await db.execute(
        `SELECT us.user_id, s.skill_name, us.proficiency_level
         FROM user_skills us
         JOIN skills s ON us.skill_id = s.skill_id
         WHERE us.skill_type = 'LEARN' AND us.user_id IN (${placeholders})`,
        userIds
      );

      // Group wanted skills by user_id
      const wantedMap = {};
      wantedRows.forEach(w => {
        if (!wantedMap[w.user_id]) wantedMap[w.user_id] = [];
        wantedMap[w.user_id].push({
          skill_name: w.skill_name,
          proficiency_level: w.proficiency_level
        });
      });

      listings.forEach(item => {
        item.wantedSkills = wantedMap[item.user_id] || [];
      });
    }

    res.json({
      success: true,
      count: listings.length,
      listings
    });
  } catch (error) {
    console.error('Error exploring skills:', error);
    res.status(500).json({ success: false, message: 'Server error exploring skills' });
  }
});

module.exports = router;
