const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Créer la base de données
const db = new sqlite3.Database(path.join(__dirname, '../database.db'), (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
  } else {
    console.log('✅ Connecté à la base de données SQLite');
  }
});

// Créer les tables
db.serialize(() => {
  // Table utilisateurs
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'franchisé',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    )
  `);

  // Table password_resets
  // Objectif: gérer la réinitialisation de mot de passe de manière sécurisée
  // Règles métier:
        // - Token à usage unique (used_at non null = consommé)
        // - Token expire après X minutes (expires_at)
        // - On stocke un hash du token, jamais le token en clair
  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Index utile pour retrouver rapidement un token
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_password_resets_user_id
    ON password_resets(user_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash
    ON password_resets(token_hash)
  `);


  // Table conversations
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      agent_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Table messages
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `);

  console.log('✅ Tables créées avec succès');
});

module.exports = db;