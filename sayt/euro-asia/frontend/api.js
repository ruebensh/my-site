// ============================================
// API CONFIGURATION
// ============================================
const API_URL = 'http://localhost:3000/api';

// ============================================
// YANGILIKLAR (news.html uchun)
// ============================================
async function loadNewsFromAPI() {
    try {
        const response = await fetch(`${API_URL}/news`);
        const data = await response.json();
        
        if (data.news && data.news.length > 0) {
            displayNewsItems(data.news);
        } else {
            console.log('Yangiliklar mavjud emas');
        }
    } catch (error) {
        console.error('API xatosi:', error);
        // Xatolik bo'lsa, sahifadagi default holatni ko'rsatadi
    }
}

function displayNewsItems(newsArray) {
    const newsList = document.getElementById('newsList');
    if (!newsList) return;
    
    // Bo'sh holatni o'chirish
    newsList.innerHTML = '';
    
    newsArray.forEach(item => {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item';
        
        const date = new Date(item.created_at);
        const formattedDate = date.toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        newsItem.innerHTML = `
            <h2>${item.title}</h2>
            <span class="news-date">📅 ${formattedDate}</span>
            <div class="news-content">
                ${item.image_path ? `<img src="http://localhost:3000${item.image_path}" alt="${item.title}" style="max-width: 100%; border-radius: 10px; margin-bottom: 15px;">` : ''}
                <p>${item.content}</p>
            </div>
        `;
        
        newsList.appendChild(newsItem);
    });
}

// ============================================
// CALENDAR (calendar.html uchun)
// ============================================
async function loadBusyDaysFromAPI() {
    try {
        const response = await fetch(`${API_URL}/calendar`);
        const data = await response.json();
        
        if (data.calendar && data.calendar.length > 0) {
            // Band kunlarni array'ga yig'ish
            const busyDays = data.calendar
                .filter(item => item.status === 'busy')
                .map(item => item.date);
            
            // Global o'zgaruvchiga yozish (calendar.html'dan foydalanish uchun)
            if (typeof window.adminBusyDays !== 'undefined') {
                window.adminBusyDays = busyDays;
            }
            
            return busyDays;
        }
        
        return [];
    } catch (error) {
        console.error('Calendar API xatosi:', error);
        return [];
    }
}

// ============================================
// ARIZA YUBORISH (calendar.html uchun)
// ============================================
async function sendOrderToAPI(orderData) {
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_name: orderData.name,
                client_phone: orderData.phone,
                client_email: orderData.email || null,
                event_date: orderData.date,
                message: `Joyi: ${orderData.location || 'Kiritilmagan'}\nVaqti: ${orderData.eventTime || 'Kiritilmagan'}\n${orderData.message || ''}`
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Ariza muvaffaqiyatli yuborildi!');
            return true;
        } else {
            console.error('❌ Ariza yuborishda xatolik:', data.error);
            return false;
        }
    } catch (error) {
        console.error('API xatosi:', error);
        return false;
    }
}

// ============================================
// HIGHLIGHTS (highlights.html uchun)
// ============================================
async function loadHighlightsFromAPI(date) {
    try {
        const response = await fetch(`${API_URL}/highlights/date/${date}`);
        const data = await response.json();
        
        if (data.highlights && data.highlights.length > 0) {
            displayHighlightsImages(data.highlights);
            return true;
        } else {
            console.log('Bu kun uchun highlights mavjud emas');
            return false;
        }
    } catch (error) {
        console.error('Highlights API xatosi:', error);
        return false;
    }
}

function displayHighlightsImages(highlights) {
    const videoArea = document.querySelector('.video-area');
    if (!videoArea) return;
    
    // Birinchi rasmni katta ko'rsatish
    if (highlights.length > 0) {
        videoArea.innerHTML = `
            <img src="http://localhost:3000${highlights[0].image_path}" 
                 alt="Highlight" 
                 style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
        `;
    }
    
    // Barcha rasmlarni galereya ko'rinishida qo'shish (ixtiyoriy)
    if (highlights.length > 1) {
        const galleryDiv = document.createElement('div');
        galleryDiv.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;';
        
        highlights.forEach(h => {
            const img = document.createElement('img');
            img.src = `http://localhost:3000${h.image_path}`;
            img.alt = 'Highlight';
            img.style.cssText = 'width: 100%; height: 200px; object-fit: cover; border-radius: 10px; cursor: pointer;';
            img.onclick = () => window.open(img.src, '_blank');
            galleryDiv.appendChild(img);
        });
        
        videoArea.parentElement.appendChild(galleryDiv);
    }
}

// ============================================
// SAHIFA YUKLANGANDA AVTOMATIK ISHLASH
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname;
    
    // news.html sahifasi
    if (currentPage.includes('news.html')) {
        await loadNewsFromAPI();
    }
    
    // calendar.html sahifasi
    if (currentPage.includes('calendar.html')) {
        const busyDays = await loadBusyDaysFromAPI();
        
        // adminBusyDays o'zgaruvchisini yangilash
        if (window.adminBusyDays) {
            window.adminBusyDays.length = 0;
            window.adminBusyDays.push(...busyDays);
        } else {
            window.adminBusyDays = busyDays;
        }
        
        // Agar calendar allaqachon yaratilgan bo'lsa, qayta yaratish
        if (typeof createYearCalendar === 'function') {
            const calendarsContainer = document.getElementById('calendars');
            if (calendarsContainer) {
                calendarsContainer.innerHTML = '';
                createYearCalendar();
            }
        }
    }
    
    // highlights.html sahifasi
    if (currentPage.includes('highlights.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const dateDisplay = urlParams.get('date');
        
        if (dateDisplay) {
            // Sana formatini API uchun o'zgartirish (misol: "05 Oktyabr 2025" -> "2025-10-05")
            const dateStr = convertDisplayDateToAPIFormat(dateDisplay);
            if (dateStr) {
                await loadHighlightsFromAPI(dateStr);
            }
        }
    }
});

// Yordamchi funksiya: Sana formatini o'zgartirish
function convertDisplayDateToAPIFormat(displayDate) {
    // Bu funksiyani kerak bo'lsa to'ldiring
    // Hozircha oddiy holatni qaytaradi
    return null;
}