const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let bot;

// Initialize bot
if (token && token !== 'YOUR_BOT_TOKEN_HERE') {
  bot = new TelegramBot(token, { polling: false });
  console.log('✅ Telegram bot initialized');
} else {
  console.warn('⚠️  Telegram bot token not configured. Notifications disabled.');
}

// Send notification
async function sendTelegramNotification(message) {
  if (!bot || !chatId || chatId === 'YOUR_CHAT_ID_HERE') {
    console.log('📱 Telegram notification (not sent - not configured):');
    console.log(message);
    return;
  }

  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    console.log('✅ Telegram notification sent');
  } catch (error) {
    console.error('❌ Telegram notification error:', error.message);
  }
}

// Send notification with buttons
async function sendNotificationWithButtons(message, buttons) {
  if (!bot || !chatId || chatId === 'YOUR_CHAT_ID_HERE') {
    console.log('📱 Telegram notification (not sent):');
    console.log(message);
    return;
  }

  try {
    const options = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: buttons
      }
    };
    
    await bot.sendMessage(chatId, message, options);
    console.log('✅ Telegram notification with buttons sent');
  } catch (error) {
    console.error('❌ Telegram notification error:', error.message);
  }
}

// Check for past events needing highlights (call this daily)
async function checkHighlightsReminder() {
  const db = require('../database/init');
  const today = new Date().toISOString().split('T')[0];
  
  const query = `
    SELECT c.*, o.client_name,
           (SELECT COUNT(*) FROM highlights WHERE calendar_id = c.id) as highlights_count
    FROM calendar c
    LEFT JOIN orders o ON c.order_id = o.id
    WHERE c.status = 'busy' 
      AND c.date < ?
      AND (SELECT COUNT(*) FROM highlights WHERE calendar_id = c.id) = 0
    ORDER BY c.date DESC
    LIMIT 5
  `;

  db.all(query, [today], (err, events) => {
    if (err) {
      console.error('Database error:', err);
      return;
    }

    if (events.length > 0) {
      let message = '📸 HIGHLIGHTS YUKLASH ESLATMASI\n\n';
      message += `Quyidagi ${events.length} ta o'tgan to'y uchun highlights yuklanmagan:\n\n`;
      
      events.forEach((event, index) => {
        message += `${index + 1}. 📅 ${event.date}`;
        if (event.client_name) {
          message += ` - ${event.client_name}`;
        }
        message += '\n';
      });

      message += '\n👉 Admin panelga kirib rasmlar yuklang!';
      
      sendTelegramNotification(message);
    }
  });
}

module.exports = {
  sendTelegramNotification,
  sendNotificationWithButtons,
  checkHighlightsReminder
};

// AUTO-CHECK: Run highlights reminder daily at 10:00 AM
if (bot) {
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 10 && now.getMinutes() === 0) {
      checkHighlightsReminder();
    }
  }, 60000); // Check every minute
}