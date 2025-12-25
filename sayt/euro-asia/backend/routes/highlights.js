const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/init');
const { verifyToken } = require('./auth');

// Rasmlar saqlanadigan papkani sozlash
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/highlights');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const isOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (isOk) cb(null, true);
    else cb(new Error('Faqat rasm fayllari qabul qilinadi'));
  }
});

// 1. Ma'lum bir sana uchun highlightni olish (Frontend uchun)
router.get('/:date', (req, res) => {
  const query = `
    SELECT h.*, c.date 
    FROM highlights h
    JOIN calendar c ON h.calendar_id = c.id
    WHERE c.date = ?
  `;
  
  db.get(query, [req.params.date], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database xatosi' });
    }
    res.json({ highlight: row || null });
  });
});

// 2. Yangi highlight qo'shish yoki mavjudini yangilash (Admin uchun)
router.post('/', verifyToken, upload.single('image'), (req, res) => {
  const { calendar_id, instagram_url } = req.body;
  const image_path = req.file ? `uploads/highlights/${req.file.filename}` : null;

  if (!calendar_id) {
    return res.status(400).json({ error: 'Calendar ID majburiy' });
  }

  // Avval bu sana uchun highlight bormligini tekshiramiz
  db.get('SELECT id, image_path FROM highlights WHERE calendar_id = ?', [calendar_id], (err, row) => {
    if (row) {
      // Yangilash (Update)
      let updateQuery = 'UPDATE highlights SET instagram_url = ?, uploaded_at = CURRENT_TIMESTAMP';
      let params = [instagram_url];

      if (image_path) {
        updateQuery += ', image_path = ?';
        params.push(image_path);
      }
      
      updateQuery += ' WHERE calendar_id = ?';
      params.push(calendar_id);

      db.run(updateQuery, params, function(err) {
        if (err) return res.status(500).json({ error: 'Update xatosi' });
        res.json({ success: true, message: 'Highlight yangilandi' });
      });
    } else {
      // Yangi yaratish (Insert)
      const insertQuery = `INSERT INTO highlights (calendar_id, instagram_url, image_path) VALUES (?, ?, ?)`;
      db.run(insertQuery, [calendar_id, instagram_url, image_path], function(err) {
        if (err) return res.status(500).json({ error: 'Saqlash xatosi' });
        res.json({ success: true, id: this.lastID });
      });
    }
  });
});

// 3. Highlightni o'chirish
router.delete('/:id', verifyToken, (req, res) => {
  db.get('SELECT image_path FROM highlights WHERE id = ?', [req.params.id], (err, row) => {
    if (row && row.image_path) {
      const fullPath = path.join(__dirname, '..', row.image_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    
    db.run('DELETE FROM highlights WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: 'O\'chirishda xatolik' });
      res.json({ success: true, message: 'O\'chirildi' });
    });
  });
});

module.exports = router;