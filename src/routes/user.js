const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const db = require('../db');

// GET /api/v1/core/user/permissions
router.get('/permissions', requireAuth, (req, res) => {
  res.json({
    uuid: req.user.uuid,
    username: req.user.username,
    permissions: ['cape.upload', 'cape.equip', 'cape.browse'],
    isBanned: false,
    isStaff: false,
  });
});

// GET /api/v1/core/user/notifications
router.get('/notifications', requireAuth, (req, res) => {
  res.json([]);
});

// POST /api/v1/core/user/notifications/read-all
router.post('/notifications/read-all', requireAuth, (req, res) => {
  res.json({ success: true });
});

// POST /api/v1/core/user/notifications/:id/read
router.post('/notifications/:id/read', requireAuth, (req, res) => {
  res.json({ success: true });
});

// GET /api/v1/core/user/discord/status
router.get('/discord/status', requireAuth, (req, res) => {
  res.json({ linked: false });
});

// DELETE /api/v1/core/user/discord
router.delete('/discord', requireAuth, (req, res) => {
  res.json({ success: true });
});

// GET /api/v1/core/user/github/status
router.get('/github/status', requireAuth, (req, res) => {
  res.json({ linked: false });
});

// DELETE /api/v1/core/user/github
router.delete('/github', requireAuth, (req, res) => {
  res.json({ success: true });
});

module.exports = router;
