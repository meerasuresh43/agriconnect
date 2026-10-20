const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// All fraud reporting endpoints require authenticated user
router.use(authenticateToken);

// POST /api/fraud-reports - Submit a report on a suspicious listing, owner, or farmer
router.post('/', async (req, res) => {
  try {
    const { reported_user_id, land_id, category, description, evidence_url } = req.body;

    if (!category || !description) {
      return res.status(400).json({ success: false, message: 'Please provide report category and detailed description.' });
    }

    const db = await getDb();

    // Validate land_id if provided
    if (land_id) {
      const land = await db.get('SELECT id, owner_id FROM lands WHERE id = ?', [land_id]);
      if (!land) {
        return res.status(404).json({ success: false, message: 'Referenced land listing not found.' });
      }
    }

    // Validate reported_user_id if provided
    if (reported_user_id) {
      const user = await db.get('SELECT id FROM users WHERE id = ?', [reported_user_id]);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Referenced user not found.' });
      }
    }

    const result = await db.run(`
      INSERT INTO fraud_reports (reporter_id, reported_user_id, land_id, category, description, evidence_url, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [req.user.id, reported_user_id || null, land_id || null, category, description.trim(), evidence_url || null]);

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. AgriConnect administrators will review this inquiry promptly.',
      reportId: result.lastID
    });
  } catch (error) {
    console.error('Fraud report submission error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
});

// GET /api/fraud-reports/my - User view of their submitted reports
router.get('/my', async (req, res) => {
  try {
    const db = await getDb();
    const reports = await db.all(`
      SELECT fr.*, l.title as land_title, u.name as reported_user_name
      FROM fraud_reports fr
      LEFT JOIN lands l ON fr.land_id = l.id
      LEFT JOIN users u ON fr.reported_user_id = u.id
      WHERE fr.reporter_id = ?
      ORDER BY fr.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve your reports.' });
  }
});

module.exports = router;
