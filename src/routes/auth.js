const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// In-memory store for pending server IDs (expires after 2 minutes)
const pendingServerIds = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, data] of pendingServerIds.entries()) {
    if (now - data.createdAt > 120_000) pendingServerIds.delete(id);
  }
}, 30_000);

// POST /api/v1/launcher/auth/request-server-id
router.post('/request-server-id', (req, res) => {
  const serverId = uuidv4().replace(/-/g, '');
  pendingServerIds.set(serverId, { createdAt: Date.now() });
  res.json({ serverId, expiresIn: 120 });
});

// POST /api/v1/launcher/auth/validate/v2
router.post('/validate/v2', async (req, res) => {
  const { username, server_id, hwid } = req.query;

  if (!username || !server_id) {
    return res.status(400).json({ error: 'username and server_id are required' });
  }

  if (!pendingServerIds.has(server_id)) {
    return res.status(401).json({ error: 'Invalid or expired server_id' });
  }
  pendingServerIds.delete(server_id);

  // Verify with Mojang hasJoined
  const mojangUrl = `https://sessionserver.mojang.com/session/minecraft/hasJoined?username=${encodeURIComponent(username)}&serverId=${encodeURIComponent(server_id)}`;

  let mojangProfile;
  try {
    const mojangRes = await fetch(mojangUrl);
    if (mojangRes.status === 204 || mojangRes.status === 403) {
      return res.status(401).json({ error: 'Minecraft session could not be verified' });
    }
    mojangProfile = await mojangRes.json();
  } catch (err) {
    console.error('[Auth] Mojang hasJoined request failed:', err.message);
    return res.status(502).json({ error: 'Failed to contact Mojang session server' });
  }

  const playerUuid = mojangProfile.id;
  if (!playerUuid) {
    return res.status(401).json({ error: 'Invalid Mojang session response' });
  }

  // Upsert user in DB
  db.prepare(`
    INSERT INTO users (uuid, username, hwid)
    VALUES (?, ?, ?)
    ON CONFLICT(uuid) DO UPDATE SET username = excluded.username, hwid = excluded.hwid
  `).run(playerUuid, username, hwid || null);

  const token = jwt.sign(
    { uuid: playerUuid, username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ value: token });
});

module.exports = router;
