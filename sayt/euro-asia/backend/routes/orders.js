const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { verifyToken } = require('./auth');
const { sendTelegramNotification } = require('../telegram/bot');

// Get all orders
router.get('/', verifyToken, (req, res) => {
  const query = `
    SELECT * FROM orders 
    ORDER BY 
      CASE status 
        WHEN 'pending' THEN 1
        WHEN 'accepted' THEN 2
        WHEN 'rejected' THEN 3
      END,
      created_at DESC
  `;
  
  db.all(query, [], (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Database xatosi' });
    }
    res.json({ orders });
  });
});

// Create new order (from frontend)
router.post('/', async (req, res) => {
  const { client_name, client_phone, client_email, event_date, message } = req.body;

  if (!client_name || !client_phone || !event_date) {
    return res.status(400).json({ error: 'Majburiy maydonlarni to\'ldiring' });
  }

  // Check if date is already busy
  db.get('SELECT * FROM calendar WHERE date = ? AND status = "busy"', [event_date], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database xatosi' });
    }

    if (row) {
      return res.status(400).json({ error: 'Bu kun allaqachon band' });
    }

    // Insert order
    const query = `
      INSERT INTO orders (client_name, client_phone, client_email, event_date, message, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `;

    db.run(query, [client_name, client_phone, client_email, event_date, message], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ariza yuborishda xatolik' });
      }

      const orderId = this.lastID;

      // Update calendar to pending
      db.run(
        'INSERT OR REPLACE INTO calendar (date, status, order_id) VALUES (?, ?, ?)',
        [event_date, 'pending', orderId]
      );

      // Send Telegram notification
      const telegramMessage = `🔔 YANGI ARIZA KELDI!

👤 Mijoz: ${client_name}
📞 Telefon: ${client_phone}
${client_email ? `📧 Email: ${client_email}\n` : ''}📅 Kun: ${event_date}
💬 Xabar: ${message || 'Yo\'q'}

⏰ ${new Date().toLocaleString('uz-UZ')}

👉 Admin panelga kiring va arizani ko'rib chiqing.`;

      sendTelegramNotification(telegramMessage);

      res.json({
        success: true,
        message: 'Arizangiz muvaffaqiyatli yuborildi',
        order_id: orderId
      });
    });
  });
});

// Accept order
router.put('/:id/accept', verifyToken, (req, res) => {
  const orderId = req.params.id;

  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) {
      return res.status(404).json({ error: 'Ariza topilmadi' });
    }

    // Update order status
    db.run('UPDATE orders SET status = "accepted", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [orderId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database xatosi' });
      }

      // Update calendar to busy
      db.run('UPDATE calendar SET status = "busy" WHERE order_id = ?', [orderId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Calendar yangilanmadi' });
        }

        // Send Telegram notification
        const telegramMessage = `✅ ARIZA QABUL QILINDI

📅 ${order.event_date} kuni band qilindi
👤 Mijoz: ${order.client_name}
📞 Telefon: ${order.client_phone}`;

        sendTelegramNotification(telegramMessage);

        res.json({ 
          success: true, 
          message: 'Ariza qabul qilindi va kun band qilindi' 
        });
      });
    });
  });
});

// Reject order
router.put('/:id/reject', verifyToken, (req, res) => {
  const orderId = req.params.id;
  const { rejection_reason } = req.body;

  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) {
      return res.status(404).json({ error: 'Ariza topilmadi' });
    }

    // Update order status
    db.run(
      'UPDATE orders SET status = "rejected", rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [rejection_reason, orderId],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database xatosi' });
        }

        // Update calendar back to free
        db.run('UPDATE calendar SET status = "free" WHERE order_id = ?', [orderId], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Calendar yangilanmadi' });
          }

          // Send Telegram notification
          const telegramMessage = `❌ ARIZA RAD ETILDI

📅 ${order.event_date}
👤 Mijoz: ${order.client_name}
📝 Sabab: ${rejection_reason || 'Ko\'rsatilmagan'}`;

          sendTelegramNotification(telegramMessage);

          res.json({ 
            success: true, 
            message: 'Ariza rad etildi' 
          });
        });
      }
    );
  });
});

module.exports = router;