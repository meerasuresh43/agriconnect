const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Handler for submitting rental requests
const handleCreateRentalRequest = async (req, res) => {
  try {
    const { land_id, message } = req.body;
    const duration_requested = req.body.duration_requested || req.body.proposed_duration_months || req.body.duration_months || '12 Months';
    const proposed_amount = req.body.proposed_amount || req.body.rental_amount || 0;

    const db = await getDb();

    const land = await db.get('SELECT owner_id, title FROM lands WHERE id = ?', [land_id]);
    if (!land) {
      return res.status(404).json({ success: false, message: 'Land listing not found.' });
    }

    // Check if duplicate request exists
    const existing = await db.get(`
      SELECT id FROM rental_requests WHERE land_id = ? AND farmer_id = ? AND status = 'pending'
    `, [land_id, req.user.id]);

    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending rental request for this land.' });
    }

    const result = await db.run(`
      INSERT INTO rental_requests (land_id, farmer_id, owner_id, duration_requested, proposed_amount, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [land_id, req.user.id, land.owner_id, String(duration_requested), proposed_amount, message || '']);

    const requestId = result.lastID;

    // Send notification to Land Owner
    await db.run(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, ?, ?)
    `, [
      land.owner_id,
      'New Rental Request Received',
      `Farmer ${req.user.name} (${req.user.farmer_user_id}) requested to rent your land: "${land.title}".`
    ]);

    res.status(201).json({ 
      success: true, 
      message: 'Rental request sent successfully to land owner!', 
      requestId,
      request: {
        id: requestId,
        land_id,
        farmer_id: req.user.id,
        owner_id: land.owner_id,
        status: 'pending',
        duration_requested: String(duration_requested),
        proposed_amount,
        message: message || '',
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Rental request error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit rental request.' });
  }
};

router.post('/request', authenticateToken, requireRole(['farmer']), handleCreateRentalRequest);
router.post('/', authenticateToken, requireRole(['farmer']), handleCreateRentalRequest);

// GET /api/rentals/my-requests - Requests sent by Farmer
router.get('/my-requests', authenticateToken, requireRole(['farmer']), async (req, res) => {
  try {
    const db = await getDb();
    const requests = await db.all(`
      SELECT r.*, 
             l.title as land_title, l.location as land_location, l.area_acres, l.rent_amount as original_rent, l.soil_type,
             u.name as owner_name, u.farmer_user_id as owner_user_id, u.phone as owner_phone
      FROM rental_requests r
      JOIN lands l ON r.land_id = l.id
      JOIN users u ON r.owner_id = u.id
      WHERE r.farmer_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve rental requests.' });
  }
});

// GET /api/rentals/incoming - Requests received by Land Owner
router.get('/incoming', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const db = await getDb();
    const requests = await db.all(`
      SELECT r.*, 
             l.title as land_title, l.location as land_location, l.area_acres, l.rent_amount as original_rent,
             u.name as farmer_name, u.farmer_user_id as farmer_user_id, u.phone as farmer_phone, u.location as farmer_location,
             fp.preferred_crop, fp.preferred_land_size
      FROM rental_requests r
      JOIN lands l ON r.land_id = l.id
      JOIN users u ON r.farmer_id = u.id
      LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
      WHERE r.owner_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve incoming rental requests.' });
  }
});

// Handler to Accept or Reject rental request (Owner only)
const handleRespondRentalRequest = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid response status.' });
    }

    const db = await getDb();
    const request = await db.get(`
      SELECT r.*, l.title as land_title 
      FROM rental_requests r 
      JOIN lands l ON r.land_id = l.id
      WHERE r.id = ? AND r.owner_id = ?
    `, [req.params.id, req.user.id]);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Rental request not found.' });
    }

    await db.run('UPDATE rental_requests SET status = ? WHERE id = ?', [status, req.params.id]);

    // If accepted, update land status to 'rented'
    if (status === 'accepted') {
      await db.run('UPDATE lands SET status = ? WHERE id = ?', ['rented', request.land_id]);
    }

    // Send notification to Farmer
    await db.run(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, ?, ?)
    `, [
      request.farmer_id,
      `Rental Request ${status === 'accepted' ? 'Accepted!' : 'Declined'}`,
      `Owner ${req.user.name} has ${status} your rental request for "${request.land_title}".`
    ]);

    res.json({ 
      success: true, 
      message: `Rental request ${status} successfully!`,
      request: {
        id: req.params.id,
        land_id: request.land_id,
        status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to process rental request.' });
  }
};

router.put('/:id/respond', authenticateToken, requireRole(['owner']), handleRespondRentalRequest);
router.put('/:id/status', authenticateToken, requireRole(['owner']), handleRespondRentalRequest);

module.exports = router;
