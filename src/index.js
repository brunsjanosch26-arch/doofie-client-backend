require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const capeRoutes = require('./routes/capes');
const launcherRoutes = require('./routes/launcher');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env');
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: 'image/png', limit: '2mb' }));

// Serve uploaded cape images
app.use('/uploads/capes', express.static(path.join(__dirname, '..', 'uploads', 'capes')));

// Routes
app.use('/api/v1/launcher/auth', authRoutes);
app.use('/api/v1/launcher', launcherRoutes);
app.use('/api/v1/cosmetics/cape', capeRoutes);
app.use('/api/v1/core/user', userRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Doofie Backend running on port ${PORT}`);
});
