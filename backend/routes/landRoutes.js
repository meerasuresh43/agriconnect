const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/lands - Discovery page with search & multi-field filtering
router.get('/', async (req, res) => {
  try {
    const { location, soil_type, water_source, crop, min_price, max_price, min_area, max_area, duration } = req.query;
    const db = await getDb();

    let query = `
      SELECT l.*, 
             u.name as owner_name, u.name as landowner_name, u.farmer_user_id as owner_user_id, u.farmer_user_id as landowner_user_id, u.is_verified as owner_verified, u.phone as owner_phone,
             (SELECT image_url FROM land_images WHERE land_id = l.id LIMIT 1) as thumbnail
      FROM lands l
      JOIN users u ON l.owner_id = u.id
      WHERE l.status = 'available' AND l.approval_status = 'approved' AND u.is_deleted = 0
    `;
    const params = [];

    if (location) {
      query += ` AND (l.location LIKE ? OR l.title LIKE ?)`;
      params.push(`%${location}%`, `%${location}%`);
    }

    if (soil_type) {
      query += ` AND l.soil_type LIKE ?`;
      params.push(`%${soil_type}%`);
    }

    if (water_source) {
      query += ` AND l.water_source LIKE ?`;
      params.push(`%${water_source}%`);
    }

    if (crop) {
      query += ` AND l.previous_crops LIKE ?`;
      params.push(`%${crop}%`);
    }

    if (min_price) {
      query += ` AND l.rent_amount >= ?`;
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      query += ` AND l.rent_amount <= ?`;
      params.push(parseFloat(max_price));
    }

    if (min_area) {
      query += ` AND l.area_acres >= ?`;
      params.push(parseFloat(min_area));
    }

    if (max_area) {
      query += ` AND l.area_acres <= ?`;
      params.push(parseFloat(max_area));
    }

    if (duration) {
      query += ` AND l.duration_months >= ?`;
      params.push(parseInt(duration));
    }

    query += ` ORDER BY l.created_at DESC`;

    const lands = await db.all(query, params);

    // Fetch images for all matching lands
    for (let land of lands) {
      const images = await db.all('SELECT image_url FROM land_images WHERE land_id = ?', [land.id]);
      land.images = images.map(img => img.image_url);
    }

    res.json({ success: true, count: lands.length, lands });
  } catch (error) {
    console.error('Fetch lands error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve available lands.' });
  }
});

// GET /api/lands/my-listings and /api/lands/my - Owner specific lands
const getMyListings = async (req, res) => {
  try {
    const db = await getDb();
    const lands = await db.all(`
      SELECT l.*, 
             (SELECT COUNT(*) FROM rental_requests WHERE land_id = l.id) as request_count,
             (SELECT image_url FROM land_images WHERE land_id = l.id LIMIT 1) as thumbnail
      FROM lands l
      WHERE l.owner_id = ?
      ORDER BY l.created_at DESC
    `, [req.user.id]);

    for (let land of lands) {
      const images = await db.all('SELECT image_url FROM land_images WHERE land_id = ?', [land.id]);
      land.images = images.map(i => i.image_url);
    }

    res.json({ success: true, count: lands.length, lands });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch owner listings.' });
  }
};

router.get('/my-listings', authenticateToken, requireRole(['owner']), getMyListings);
router.get('/my', authenticateToken, requireRole(['owner']), getMyListings);

// GET /api/lands/:id - Detailed land view
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const land = await db.get(`
      SELECT l.*, 
             u.name as owner_name, u.farmer_user_id as owner_user_id, u.is_verified as owner_verified, u.location as owner_location, u.phone as owner_phone
      FROM lands l
      JOIN users u ON l.owner_id = u.id
      WHERE l.id = ?
    `, [req.params.id]);

    if (!land) {
      return res.status(404).json({ success: false, message: 'Land listing not found.' });
    }

    const images = await db.all('SELECT image_url FROM land_images WHERE land_id = ?', [land.id]);
    land.images = images.map(i => i.image_url);

    // Note: Do NOT return land_documents publicly! Documents remain private and only accessible by admin.

    res.json({ success: true, land });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error loading land details.' });
  }
});

// POST /api/lands - Create new land listing (Owner only)
router.post('/', authenticateToken, requireRole(['owner']), upload.fields([
  { name: 'images', maxCount: 6 },
  { name: 'ownershipDoc', maxCount: 1 },
  { name: 'identityDoc', maxCount: 1 }
]), async (req, res) => {
  try {
    const title = req.body.title;
    const location = req.body.location;
    const area_acres = req.body.area_acres || req.body.land_area_acres;
    const rent_amount = req.body.rent_amount || req.body.price_per_month;
    const rent_unit = req.body.rent_unit || 'per_month';
    const duration_months = req.body.duration_months || req.body.rental_duration_months || 12;
    const available_from = req.body.available_from || new Date().toISOString().split('T')[0];
    const soil_type = req.body.soil_type;
    const water_source = req.body.water_source;
    const electricity = req.body.electricity !== undefined ? (typeof req.body.electricity === 'boolean' ? (req.body.electricity ? 'Available' : 'Not Available') : req.body.electricity) : 'Available';
    const previous_crops = req.body.previous_crops || '';
    const description = req.body.description || '';
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;

    if (!title || !location || !area_acres || !rent_amount || !soil_type || !water_source) {
      return res.status(400).json({ success: false, message: 'Required land details missing.' });
    }

    const lat = latitude ? parseFloat(latitude) : (10.5 + Math.random() * 2.0);
    const lng = longitude ? parseFloat(longitude) : (77.0 + Math.random() * 2.0);

    const db = await getDb();

    const result = await db.run(`
      INSERT INTO lands (owner_id, title, location, latitude, longitude, area_acres, rent_amount, rent_unit, duration_months, available_from, soil_type, water_source, electricity, previous_crops, description, status, approval_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', 'approved')
    `, [
      req.user.id, title, location, lat, lng, parseFloat(area_acres), parseFloat(rent_amount),
      rent_unit, parseInt(duration_months), available_from,
      soil_type, water_source, electricity, previous_crops, description
    ]);

    const landId = result.lastID;

    // Handle Image Files
    if (req.files && req.files['images']) {
      for (const file of req.files['images']) {
        const fileUrl = `/uploads/${file.filename}`;
        await db.run('INSERT INTO land_images (land_id, image_url) VALUES (?, ?)', [landId, fileUrl]);
      }
    } else if (req.body.imageUrl) {
      await db.run('INSERT INTO land_images (land_id, image_url) VALUES (?, ?)', [landId, req.body.imageUrl]);
    }
    // If no image uploaded, no stock photos are inserted into the database!

    // Handle Private Documents (Ownership & Identity) with default PENDING verification
    if (req.files && req.files['ownershipDoc']) {
      const file = req.files['ownershipDoc'][0];
      await db.run('INSERT INTO land_documents (land_id, doc_type, doc_url, verification_status) VALUES (?, ?, ?, "pending")', [
        landId, 'ownership', `/uploads/${file.filename}`
      ]);
    }
    if (req.files && req.files['identityDoc']) {
      const file = req.files['identityDoc'][0];
      await db.run('INSERT INTO land_documents (land_id, doc_type, doc_url, verification_status) VALUES (?, ?, ?, "pending")', [
        landId, 'identity', `/uploads/${file.filename}`
      ]);
    }

    res.status(201).json({ 
      success: true, 
      message: 'Land listing submitted successfully!', 
      landId,
      land: {
        id: landId,
        owner_id: req.user.id,
        landowner_id: req.user.id,
        title,
        location,
        area_acres: parseFloat(area_acres),
        rent_amount: parseFloat(rent_amount),
        status: 'available'
      }
    });
  } catch (error) {
    console.error('Create land error:', error);
    res.status(500).json({ success: false, message: 'Failed to add land listing.' });
  }
});

// PUT /api/lands/:id - Update land listing (Owner only)
router.put('/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { title, location, area_acres, rent_amount, duration_months, soil_type, water_source, electricity, previous_crops, description, status } = req.body;
    const db = await getDb();

    const land = await db.get('SELECT owner_id FROM lands WHERE id = ?', [req.params.id]);
    if (!land) {
      return res.status(404).json({ success: false, message: 'Land not found.' });
    }
    if (land.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this land.' });
    }

    await db.run(`
      UPDATE lands 
      SET title = ?, location = ?, area_acres = ?, rent_amount = ?, duration_months = ?, 
          soil_type = ?, water_source = ?, electricity = ?, previous_crops = ?, description = ?, status = ?
      WHERE id = ?
    `, [title, location, parseFloat(area_acres), parseFloat(rent_amount), parseInt(duration_months), soil_type, water_source, electricity, previous_crops, description, status || 'available', req.params.id]);

    res.json({ success: true, message: 'Land details updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update land.' });
  }
});

// DELETE /api/lands/:id - Unlist/Delete land (Owner or Admin)
router.delete('/:id', authenticateToken, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const db = await getDb();
    const land = await db.get('SELECT owner_id FROM lands WHERE id = ?', [req.params.id]);

    if (!land) {
      return res.status(404).json({ success: false, message: 'Land not found.' });
    }
    if (land.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this land.' });
    }

    await db.run('DELETE FROM lands WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Land listing deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete land listing.' });
  }
});

module.exports = router;
