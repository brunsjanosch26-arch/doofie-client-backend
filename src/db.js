const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'doofie.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uuid TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    hwid TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS capes (
    hash TEXT PRIMARY KEY,
    owner_uuid TEXT NOT NULL,
    filename TEXT NOT NULL,
    has_elytra INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (owner_uuid) REFERENCES users(uuid)
  );

  CREATE TABLE IF NOT EXISTS equipped_capes (
    user_uuid TEXT PRIMARY KEY,
    cape_hash TEXT NOT NULL,
    FOREIGN KEY (user_uuid) REFERENCES users(uuid),
    FOREIGN KEY (cape_hash) REFERENCES capes(hash)
  );

  CREATE TABLE IF NOT EXISTS favorite_capes (
    user_uuid TEXT NOT NULL,
    cape_hash TEXT NOT NULL,
    PRIMARY KEY (user_uuid, cape_hash),
    FOREIGN KEY (user_uuid) REFERENCES users(uuid),
    FOREIGN KEY (cape_hash) REFERENCES capes(hash)
  );
`);

module.exports = db;
