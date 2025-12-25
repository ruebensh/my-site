const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { verifyToken } = require('./auth');

// Get all calendar dates
router.get('/', (req, res) => {
  const query = `
    SELECT c.*, o.client_name, o.client_phone 
    FROM calendar c
    LEFT JOIN orders o ON c.order_id = o.id
    ORDER BY c.date ASC
  `;
  
  db.all(query, [], (err, dates) => {
    if (err) {
      return res.status(500).json({ error: 'Database xatosi' });
    }
    res.json({ calendar: dates });
  });
});

// Get calendar by date range
router.get('/range', (req, res) => {
  const { start_date, end_date } = req.query;
  
  const query = `
    SELECT c.*, o.client_name, o.client_phone 
    FROM calendar c
    LEFT JOIN orders o ON c.order_id = o.id
    WHERE c.date BETWEEN ? AND ?
    ORDER BY c.date ASC
  `;
  
  db.all(query, [start_date, end_date], (err, dates) => {
    if (err) {
      return res.status(500).json({ error: 'Database xatosi' });
    }
    res.json({ calendar: dates });
  });
});

// Get past busy dates (for highlights)
router.get('/past-busy', verifyToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const query = `
    SELECT c.*, o.client_name, o.event_date,
           (SELECT COUNT(*) FROM highlights WHERE calendar_id = c.id) as highlights_count
    FROM calendar c
    LEFT JOIN orders o ON c.order_id = o.id
    WHERE c.status = 'busy' AND c.date < ?
    ORDER BY c.date DESC
  `;
  
  db.all(query, [today], (err, dates) => {
    if (err) {
      return res.status(500).json({ error: 'Database xatosi' });
    }
    res.json({ past_events: dates });
  });
});

// Manually add busy date
router.post('/busy', verifyToken, (req, res) => {
  const { date, manual_reason } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Sana majburiy' });
  }

  const query = `
    INSERT OR REPLACE INTO calendar (date, status, manual_reason)
    VALUES (?, 'busy', ?)
  `;

  db.run(query, [date, manual_reason], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database xatosi' });
    }

    res.json({
      success: true,
      message: 'Kun band qilindi',
      calendar_id: this.lastID
    });
  });
});

// Remove busy date
router.delete('/:id', verifyToken, (req, res) => {
  const calendarId = req.params.id;

  // Check if linked to an order
  db.get('SELECT * FROM calendar WHERE id = ?', [calendarId], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Kun topilmadi' });
    }

    if (row.order_id) {
      return res.status(400).json({ 
        error: 'Bu kun ariza orqali band qilingan. Arizani rad eting.' 
      });
    }

    db.run('DELETE FROM calendar WHERE id = ?', [calendarId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database xatosi' });
      }

      res.json({ 
        success: true, 
        message: 'Kun o\'chirildi' 
      });
    });
  });
});

module.exports = router;