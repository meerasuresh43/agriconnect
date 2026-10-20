const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const { getDb } = require('./db');
const { initMainAdmin } = require('./setup-admin');
const authRoutes = require('./routes/authRoutes');
const landRoutes = require('./routes/landRoutes');
const rentalRoutes = require('./routes/rentalRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const fraudRoutes = require('./routes/fraudRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/lands', landRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/rental-requests', rentalRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/fraud-reports', fraudRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'AgriConnect AI API Server is active and healthy.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ success: false, message: 'An internal server error occurred.' });
});

// Initialize database, setup Main Admin, and start server
async function startServer() {
  try {
    await getDb();
    await initMainAdmin({ silent: true, isServerStart: true });

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🌾 AgriConnect AI Backend Running on http://localhost:${PORT}`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
