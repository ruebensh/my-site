const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/init');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username va parol majburiy' });
  }

  db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
    if (err) {
      return res.status(500).json({ error: 'Database xatosi' });
    }

    if (!admin) {
      return res.status(401).json({ error: 'Noto\'g\'ri username yoki parol' });
    }

    const isValidPassword = bcrypt.compareSync(password, admin.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Noto\'g\'ri username yoki parol' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Muvaffaqiyatli kirildi',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        full_name: admin.full_name
      }
    });
  });
});

// Verify token (middleware)
router.get('/verify', verifyToken, (req, res) => {
  res.json({ 
    success: true, 
    admin: req.admin 
  });
});

// Middleware function to verify JWT
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ error: 'Token topilmadi' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token yaroqsiz' });
    }
    
    req.admin = decoded;
    next();
  });
}

module.exports = router;
module.exports.verifyToken = verifyToken;