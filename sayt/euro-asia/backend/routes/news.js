const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/init');
const { verifyToken } = require('./auth');

// Configure multer for news images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/news');
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari qabul qilinadi'));
    }
  }
});

// Get all news (public)
router.get('/', (req, res) => {
  db.all('SELECT * FROM news WHERE published = 1 ORDER BY created_at DESC', [], (err, news) => {
    if (err) {
      return res.status(500).json({ error: 'Database xatosi' });
    }
    res.json({ news });
  });
});

// Get all news including unpublished (admin only)
router.get('/all', verifyToken, (req, res) => {
  db.all('SELECT * FROM news ORDER BY created_at DESC', [], (err, news) => {
    if (err) {
      return res.status(500).json({ error: 'Database xatosi' });
    }
    res.json({ news });
  });
});

// Get single news
router.get('/:id', (req, res) => {
  const newsId = req.params.id;
  
  db.get('SELECT * FROM news WHERE id = ?', [newsId], (err, news) => {
    if (err || !news) {
      return res.status(404).json({ error: 'Yangilik topilmadi' });
    }
    res.json({ news });
  });
});

// Create news
router.post('/', verifyToken, upload.single('image'), (req, res) => {
  const { title, content, published } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Sarlavha va matn majburiy' });
  }

  const imagePath = req.file ? `/uploads/news/${req.file.filename}` : null;
  const isPublished = published === 'true' || published === '1' ? 1 : 0;

  const query = `
    INSERT INTO news (title, content, image_path, published)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [title, content, imagePath, isPublished], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database xatosi' });
    }

    res.json({
      success: true,
      message: 'Yangilik qo\'shildi',
      news_id: this.lastID
    });
  });
});

// Update news
router.put('/:id', verifyToken, upload.single('image'), (req, res) => {
  const newsId = req.params.id;
  const { title, content, published } = req.body;

  db.get('SELECT * FROM news WHERE id = ?', [newsId], (err, existingNews) => {
    if (err || !existingNews) {
      return res.status(404).json({ error: 'Yangilik topilmadi' });
    }

    const imagePath = req.file ? `/uploads/news/${req.file.filename}` : existingNews.image_path;
    const isPublished = published === 'true' || published === '1' ? 1 : 0;

    const query = `
      UPDATE news 
      SET title = ?, content = ?, image_path = ?, published = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(query, [title, content, imagePath, isPublished, newsId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database xatosi' });
      }

      // Delete old image if new one uploaded
      if (req.file && existingNews.image_path) {
        const oldImagePath = path.join(__dirname, '..', existingNews.image_path);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error('Old image deletion error:', err);
        });
      }

      res.json({
        success: true,
        message: 'Yangilik yangilandi'
      });
    });
  });
});

// Delete news
router.delete('/:id', verifyToken, (req, res) => {
  const newsId = req.params.id;

  db.get('SELECT * FROM news WHERE id = ?', [newsId], (err, news) => {
    if (err || !news) {
      return res.status(404).json({ error: 'Yangilik topilmadi' });
    }

    db.run('DELETE FROM news WHERE id = ?', [newsId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database xatosi' });
      }

      // Delete image file
      if (news.image_path) {
        const imagePath = path.join(__dirname, '..', news.image_path);
        fs.unlink(imagePath, (err) => {
          if (err) console.error('Image deletion error:', err);
        });
      }

      res.json({
        success: true,
        message: 'Yangilik o\'chirildi'
      });
    });
  });
});

// Toggle publish status
router.patch('/:id/toggle-publish', verifyToken, (req, res) => {
  const newsId = req.params.id;

  db.get('SELECT published FROM news WHERE id = ?', [newsId], (err, news) => {
    if (err || !news) {
      return res.status(404).json({ error: 'Yangilik topilmadi' });
    }

    const newStatus = news.published === 1 ? 0 : 1;

    db.run('UPDATE news SET published = ? WHERE id = ?', [newStatus, newsId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database xatosi' });
      }

      res.json({
        success: true,
        message: newStatus === 1 ? 'Yangilik nashr qilindi' : 'Yangilik yashirildi',
        published: newStatus
      });
    });
  });
});

module.exports = router;