const express = require('express');
const router = express.Router();

// GET /api/v1/launcher/versions
router.get('/versions', (req, res) => {
  res.json([
    { id: 'fabric-1.21.1', name: 'Fabric 1.21.1', mcVersion: '1.21.1', type: 'fabric' },
    { id: 'fabric-1.20.1', name: 'Fabric 1.20.1', mcVersion: '1.20.1', type: 'fabric' },
  ]);
});

// GET /api/v1/launcher/pack/:name
router.get('/pack/:name', (req, res) => {
  res.json({
    name: req.params.name,
    versions: [],
    description: '',
  });
});

module.exports = router;
