const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // 1. Adminlar jadvali
    db.run(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Arizalar (Orders) jadvali
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        client_email TEXT,
        event_date DATE NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'pending',
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Kalendar jadvali
    db.run(`
      CREATE TABLE IF NOT EXISTS calendar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE UNIQUE NOT NULL,
        status TEXT DEFAULT 'free',
        order_id INTEGER,
        manual_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )
    `);

    // 4. Highlights (Lavhalar) jadvali - YANGILANGAN
    db.run(`
      CREATE TABLE IF NOT EXISTS highlights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        calendar_id INTEGER NOT NULL,
        instagram_url TEXT, -- Instagram video linki uchun
        image_path TEXT,    -- Muqova rasmi (endi ixtiyoriy)
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        uploaded_by TEXT,
        FOREIGN KEY (calendar_id) REFERENCES calendar(id)
      )
    `);

    // 5. Yangiliklar jadvali
    db.run(`
      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        image_path TEXT,
        published INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Default adminlarni yaratish
    const defaultAdmins = [
      { username: 'admin1', password: 'pass1', full_name: 'Administrator 1' },
      { username: 'admin2', password: 'pass2', full_name: 'Administrator 2' },
      { username: 'admin3', password: 'pass3', full_name: 'Administrator 3' }
    ];

    defaultAdmins.forEach(admin => {
      db.get('SELECT * FROM admins WHERE username = ?', [admin.username], (err, row) => {
        if (!row) {
          const hashedPassword = bcrypt.hashSync(admin.password, 10);
          db.run(
            'INSERT INTO admins (username, password, full_name) VALUES (?, ?, ?)',
            [admin.username, hashedPassword, admin.full_name],
            (err) => {
              if (err) console.error(`❌ Error creating ${admin.username}:`, err);
              else console.log(`✅ Created default admin: ${admin.username}`);
            }
          );
        }
      });
    });
  });
}

module.exports = db;