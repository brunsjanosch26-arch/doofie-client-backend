const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'capes');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

function formatCape(row, favoritedBy) {
  return {
    hash: row.hash,
    ownerUuid: row.owner_uuid,
    hasElytra: row.has_elytra === 1,
    useCount: row.use_count,
    createdAt: row.created_at,
    favoriteCount: 0,
    isFavorited: favoritedBy ? !!db.prepare('SELECT 1 FROM favorite_capes WHERE user_uuid=? AND cape_hash=?').get(favoritedBy, row.hash) : false,
    textureUrl: `/uploads/capes/${row.hash}.png`,
  };
}

// GET /api/v1/cosmetics/cape/browse
router.get('/browse', requireAuth, (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
  const offset = page * pageSize;

  const capes = db.prepare('SELECT * FROM capes ORDER BY created_at DESC LIMIT ? OFFSET ?').all(pageSize, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM capes').get().c;

  res.json({
    capes: capes.map(c => formatCape(c, req.user.uuid)),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

// GET /api/v1/cosmetics/cape/user/:uuid
router.get('/user/:uuid', requireAuth, (req, res) => {
  const equipped = db.prepare('SELECT * FROM capes WHERE hash = (SELECT cape_hash FROM equipped_capes WHERE user_uuid=?)').get(req.params.uuid);
  res.json({ equippedCape: equipped ? formatCape(equipped, req.user.uuid) : null });
});

// GET /api/v1/cosmetics/cape/owned/list
router.get('/owned/list', requireAuth, (req, res) => {
  const capes = db.prepare('SELECT c.* FROM capes c WHERE c.owner_uuid=?').all(req.user.uuid);
  res.json(capes.map(c => formatCape(c, req.user.uuid)));
});

// GET /api/v1/cosmetics/cape/many
router.get('/many', requireAuth, (req, res) => {
  const hashes = (req.query.hash || '').split(',').filter(Boolean).slice(0, 100);
  if (hashes.length === 0) return res.json([]);
  const placeholders = hashes.map(() => '?').join(',');
  const capes = db.prepare(`SELECT * FROM capes WHERE hash IN (${placeholders})`).all(...hashes);
  res.json(capes.map(c => formatCape(c, req.user.uuid)));
});

// POST /api/v1/cosmetics/cape/:hash/equip
router.post('/:hash/equip', requireAuth, (req, res) => {
  const cape = db.prepare('SELECT * FROM capes WHERE hash=?').get(req.params.hash);
  if (!cape) return res.status(404).json({ error: 'Cape not found' });

  db.prepare('INSERT INTO equipped_capes (user_uuid, cape_hash) VALUES (?, ?) ON CONFLICT(user_uuid) DO UPDATE SET cape_hash=excluded.cape_hash')
    .run(req.user.uuid, req.params.hash);
  db.prepare('UPDATE capes SET use_count = use_count + 1 WHERE hash=?').run(req.params.hash);

  res.json({ success: true });
});

// POST /api/v1/cosmetics/cape/unequip
router.post('/unequip', requireAuth, (req, res) => {
  db.prepare('DELETE FROM equipped_capes WHERE user_uuid=?').run(req.user.uuid);
  res.json({ success: true });
});

// POST /api/v1/cosmetics/cape  (upload)
router.post('/', requireAuth, (req, res, next) => {
  // Support both multipart upload and raw body
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart')) {
    upload.single('file')(req, res, next);
  } else {
    next();
  }
}, (req, res) => {
  let imageData;
  if (req.file) {
    imageData = req.file.buffer;
  } else if (req.body && Buffer.isBuffer(req.body)) {
    imageData = req.body;
  } else {
    return res.status(400).json({ error: 'No image data provided' });
  }

  const hash = crypto.createHash('sha256').update(imageData).digest('hex').slice(0, 32);
  const filepath = path.join(uploadsDir, `${hash}.png`);
  fs.writeFileSync(filepath, imageData);

  const existing = db.prepare('SELECT hash FROM capes WHERE hash=?').get(hash);
  if (!existing) {
    db.prepare('INSERT INTO capes (hash, owner_uuid, filename) VALUES (?, ?, ?)').run(hash, req.user.uuid, `${hash}.png`);
  }

  res.type('text').send(hash);
});

// DELETE /api/v1/cosmetics/cape/:hash
router.delete('/:hash', requireAuth, (req, res) => {
  const cape = db.prepare('SELECT * FROM capes WHERE hash=? AND owner_uuid=?').get(req.params.hash, req.user.uuid);
  if (!cape) return res.status(404).json({ error: 'Cape not found or not owned by you' });

  db.prepare('DELETE FROM equipped_capes WHERE cape_hash=?').run(req.params.hash);
  db.prepare('DELETE FROM favorite_capes WHERE cape_hash=?').run(req.params.hash);
  db.prepare('DELETE FROM capes WHERE hash=?').run(req.params.hash);

  const filepath = path.join(uploadsDir, cape.filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

  res.json({ success: true });
});

// POST /api/v1/cosmetics/cape/favorite/:hash
router.post('/favorite/:hash', requireAuth, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO favorite_capes (user_uuid, cape_hash) VALUES (?, ?)').run(req.user.uuid, req.params.hash);
  const favorites = db.prepare('SELECT cape_hash FROM favorite_capes WHERE user_uuid=?').all(req.user.uuid).map(r => r.cape_hash);
  res.json(favorites);
});

// DELETE /api/v1/cosmetics/cape/favorite/:hash
router.delete('/favorite/:hash', requireAuth, (req, res) => {
  db.prepare('DELETE FROM favorite_capes WHERE user_uuid=? AND cape_hash=?').run(req.user.uuid, req.params.hash);
  const favorites = db.prepare('SELECT cape_hash FROM favorite_capes WHERE user_uuid=?').all(req.user.uuid).map(r => r.cape_hash);
  res.json(favorites);
});

module.exports = router;
