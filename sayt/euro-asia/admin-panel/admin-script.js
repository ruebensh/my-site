const API_URL = 'http://localhost:3000/api';
let currentOrder = null;
let currentCalendarId = null;
let selectedFiles = [];
let currentFilter = 'all';

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    
    const admin = JSON.parse(localStorage.getItem('admin_user'));
    document.getElementById('adminName').textContent = admin.full_name;
    
    return token;
}

// Logout
function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = 'login.html';
}

// API Request helper
async function apiRequest(endpoint, options = {}) {
    const token = checkAuth();
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        if (response.status === 401 || response.status === 403) {
            logout();
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        alert('Server bilan bog\'lanishda xatolik');
        return null;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initNavigation();
    loadDashboard();
    updateCurrentDate();
    
    // Auto refresh every 30 seconds
    setInterval(() => {
        const activeSection = document.querySelector('.section.active').id;
        if (activeSection === 'dashboard-section') {
            loadDashboard();
        } else if (activeSection === 'orders-section') {
            loadOrders();
        }
    }, 30000);
});

// Navigation
function initNavigation() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(`${section}-section`).classList.add('active');
            
            const titles = {
                dashboard: 'Dashboard',
                orders: 'Arizalar',
                calendar: 'Calendar',
                highlights: 'Highlights',
                news: 'Yangiliklar'
            };
            document.getElementById('pageTitle').textContent = titles[section];
            
            // Load section data
            switch(section) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'orders':
                    loadOrders();
                    break;
                case 'calendar':
                    loadCalendar();
                    break;
                case 'highlights':
                    loadHighlights();
                    break;
                case 'news':
                    loadNews();
                    break;
            }
        });
    });
}

function updateCurrentDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('uz-UZ', options);
}

// Dashboard
async function loadDashboard() {
    // Load stats
    const orders = await apiRequest('/orders');
    const calendar = await apiRequest('/calendar');
    const news = await apiRequest('/news');
    const pastEvents = await apiRequest('/calendar/past-busy');
    
    if (orders) {
        const pending = orders.orders.filter(o => o.status === 'pending').length;
        document.getElementById('pendingOrdersCount').textContent = pending;
        document.getElementById('ordersBadge').textContent = pending;
        
        // Load recent orders
        const recentOrders = orders.orders.slice(0, 5);
        displayRecentOrders(recentOrders);
    }
    
    if (calendar) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const busyThisMonth = calendar.calendar.filter(c => {
            const date = new Date(c.date);
            return c.status === 'busy' && date >= firstDay && date <= lastDay;
        }).length;
        
        document.getElementById('busyDaysCount').textContent = busyThisMonth;
    }
    
    if (pastEvents) {
        const needHighlights = pastEvents.past_events.filter(e => e.highlights_count === 0).length;
        document.getElementById('pendingHighlightsCount').textContent = needHighlights;
    }
    
    if (news) {
        const published = news.news.filter(n => n.published === 1).length;
        document.getElementById('newsCount').textContent = published;
    }
}

function displayRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Hozircha arizalar yo\'q</p></div>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-card" onclick="viewOrder(${order.id})">
            <div class="order-header">
                <strong>${order.client_name}</strong>
                <span class="order-status status-${order.status}">
                    ${order.status === 'pending' ? 'Kutilmoqda' : 
                      order.status === 'accepted' ? 'Qabul qilingan' : 'Rad etilgan'}
                </span>
            </div>
            <div class="order-body">
                <p><strong>📅 Sana:</strong> ${formatDate(order.event_date)}</p>
                <p><strong>📞 Telefon:</strong> ${order.client_phone}</p>
            </div>
        </div>
    `).join('');
}

// Orders
async function loadOrders() {
    const data = await apiRequest('/orders');
    if (!data) return;
    
    displayOrders(data.orders);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            displayOrders(data.orders);
        });
    });
}

function displayOrders(orders) {
    const container = document.getElementById('ordersList');
    
    let filtered = orders;
    if (currentFilter !== 'all') {
        filtered = orders.filter(o => o.status === currentFilter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>Arizalar topilmadi</p></div>';
        return;
    }
    
    container.innerHTML = filtered.map(order => `
        <div class="order-card" onclick="viewOrder(${order.id})">
            <div class="order-header">
                <strong>${order.client_name}</strong>
                <span class="order-status status-${order.status}">
                    ${order.status === 'pending' ? 'Kutilmoqda' : 
                      order.status === 'accepted' ? 'Qabul qilingan' : 'Rad etilgan'}
                </span>
            </div>
            <div class="order-body">
                <p><strong>📅 Kun:</strong> ${formatDate(order.event_date)}</p>
                <p><strong>📞 Telefon:</strong> ${order.client_phone}</p>
                ${order.client_email ? `<p><strong>📧 Email:</strong> ${order.client_email}</p>` : ''}
                ${order.message ? `<p><strong>💬 Xabar:</strong> ${order.message}</p>` : ''}
                <p style="font-size: 12px; color: #999; margin-top: 10px;">
                    ${new Date(order.created_at).toLocaleString('uz-UZ')}
                </p>
            </div>
        </div>
    `).join('');
}

async function viewOrder(orderId) {
    const data = await apiRequest('/orders');
    currentOrder = data.orders.find(o => o.id === orderId);
    
    if (!currentOrder) return;
    
    const detailsHtml = `
        <div style="margin-bottom: 20px;">
            <p><strong>Mijoz:</strong> ${currentOrder.client_name}</p>
            <p><strong>Telefon:</strong> ${currentOrder.client_phone}</p>
            ${currentOrder.client_email ? `<p><strong>Email:</strong> ${currentOrder.client_email}</p>` : ''}
            <p><strong>Kun:</strong> ${formatDate(currentOrder.event_date)}</p>
            ${currentOrder.message ? `<p><strong>Xabar:</strong> ${currentOrder.message}</p>` : ''}
            <p><strong>Status:</strong> <span class="order-status status-${currentOrder.status}">
                ${currentOrder.status === 'pending' ? 'Kutilmoqda' : 
                  currentOrder.status === 'accepted' ? 'Qabul qilingan' : 'Rad etilgan'}
            </span></p>
            ${currentOrder.rejection_reason ? `<p style="color: #f44336;"><strong>Rad etish sababi:</strong> ${currentOrder.rejection_reason}</p>` : ''}
        </div>
    `;
    
    document.getElementById('orderDetails').innerHTML = detailsHtml;
    
    // Show/hide action buttons based on status
    const acceptBtn = document.getElementById('acceptOrderBtn');
    const rejectBtn = document.getElementById('rejectOrderBtn');
    
    if (currentOrder.status === 'pending') {
        acceptBtn.style.display = 'inline-block';
        rejectBtn.style.display = 'inline-block';
        acceptBtn.onclick = () => acceptOrder(currentOrder.id);
        rejectBtn.onclick = () => showRejectModal();
    } else {
        acceptBtn.style.display = 'none';
        rejectBtn.style.display = 'none';
    }
    
    showModal('orderModal');
}

async function acceptOrder(orderId) {
    if (!confirm('Arizani qabul qilasizmi? Kun avtomatik band qilinadi.')) return;
    
    const data = await apiRequest(`/orders/${orderId}/accept`, { method: 'PUT' });
    
    if (data && data.success) {
        alert('Ariza qabul qilindi va kun band qilindi!');
        closeModal('orderModal');
        loadOrders();
        loadDashboard();
    }
}

function showRejectModal() {
    closeModal('orderModal');
    showModal('rejectModal');
}

async function confirmReject() {
    const reason = document.getElementById('rejectionReason').value.trim();
    
    if (!reason) {
        alert('Iltimos, rad etish sababini kiriting');
        return;
    }
    
    const data = await apiRequest(`/orders/${currentOrder.id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ rejection_reason: reason })
    });
    
    if (data && data.success) {
        alert('Ariza rad etildi');
        closeModal('rejectModal');
        document.getElementById('rejectionReason').value = '';
        loadOrders();
        loadDashboard();
    }
}

// Calendar
async function loadCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const data = await apiRequest(`/calendar/range?start_date=${firstDay.toISOString().split('T')[0]}&end_date=${lastDay.toISOString().split('T')[0]}`);
    
    if (!data) return;
    
    displayCalendar(year, month, data.calendar);
}

function displayCalendar(year, month, calendarData) {
    const container = document.getElementById('calendarView');
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const calendarMap = {};
    calendarData.forEach(item => {
        calendarMap[item.date] = item;
    });
    
    let html = '<div class="calendar-grid">';
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const calItem = calendarMap[dateStr] || { status: 'free' };
        
        html += `
            <div class="calendar-day ${calItem.status}" onclick="selectDate('${dateStr}', '${calItem.status}')">
                <div class="date">${day}</div>
                <div class="status">
                    ${calItem.status === 'free' ? 'Bo\'sh' : 
                      calItem.status === 'pending' ? 'Kutilmoqda' : 'Band'}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function selectDate(date, status) {
    alert(`${formatDate(date)} - ${status === 'free' ? 'Bo\'sh kun' : status === 'pending' ? 'Ariza kutilmoqda' : 'Band kun'}`);
}

function showAddBusyDateModal() {
    showModal('busyDateModal');
}

document.getElementById('busyDateForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const date = document.getElementById('busyDate').value;
    const reason = document.getElementById('busyReason').value;
    
    const data = await apiRequest('/calendar/busy', {
        method: 'POST',
        body: JSON.stringify({ date, manual_reason: reason })
    });
    
    if (data && data.success) {
        alert('Kun band qilindi!');
        closeModal('busyDateModal');
        document.getElementById('busyDateForm').reset();
        loadCalendar();
    }
});

// Highlights
async function loadHighlights() {
    const data = await apiRequest('/calendar/past-busy');
    if (!data) return;
    
    displayPastEvents(data.past_events);
}

function displayPastEvents(events) {
    const container = document.getElementById('pastEventsList');
    
    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📸</div><p>O\'tgan to\'ylar yo\'q</p></div>';
        return;
    }
    
    container.innerHTML = events.map(event => `
        <div class="event-card">
            <div class="event-card-header">
                <div>
                    <strong>📅 ${formatDate(event.date)}</strong>
                    ${event.client_name ? `<p style="color: #666; margin-top: 5px;">${event.client_name}</p>` : ''}
                </div>
                <div>
                    ${event.highlights_count > 0 ? 
                        `<span style="color: #4caf50;">✅ ${event.highlights_count} ta rasm</span>` :
                        `<button class="btn btn-primary btn-small" onclick="showHighlightsUploadModal(${event.id}, '${event.date}', '${event.client_name || ''}')">📸 Yuklash</button>`
                    }
                </div>
            </div>
            ${event.highlights_count > 0 ? `
                <div class="highlights-grid" id="highlights-${event.id}"></div>
                <script>loadEventHighlights(${event.id})</script>
            ` : ''}
        </div>
    `).join('');
    
    // Load highlights for events that have them
    events.forEach(event => {
        if (event.highlights_count > 0) {
            loadEventHighlights(event.id);
        }
    });
}

async function loadEventHighlights(calendarId) {
    const data = await apiRequest(`/highlights/calendar/${calendarId}`);
    if (!data) return;
    
    const container = document.getElementById(`highlights-${calendarId}`);
    if (!container) return;
    
    container.innerHTML = data.highlights.map(h => `
        <img src="http://localhost:3000${h.image_path}" class="highlight-img" alt="Highlight">
    `).join('');
}

function showHighlightsUploadModal(calendarId, date, clientName) {
    currentCalendarId = calendarId;
    selectedFiles = [];
    
    document.getElementById('highlightsEventInfo').innerHTML = `
        <p><strong>📅 Sana:</strong> ${formatDate(date)}</p>
        ${clientName ? `<p><strong>👤 Mijoz:</strong> ${clientName}</p>` : ''}
    `;
    
    document.getElementById('previewArea').innerHTML = '';
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('highlightsInput');
    
    uploadArea.onclick = () => fileInput.click();
    
    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.style.background = '#f8f9ff';
    };
    
    uploadArea.ondragleave = () => {
        uploadArea.style.background = '';
    };
    
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.style.background = '';
        handleFiles(e.dataTransfer.files);
    };
    
    fileInput.onchange = (e) => {
        handleFiles(e.target.files);
    };
    
    showModal('highlightsModal');
}

function handleFiles(files) {
    selectedFiles = Array.from(files);
    displayPreviews();
}

function displayPreviews() {
    const container = document.getElementById('previewArea');
    container.innerHTML = '<div class="preview-grid">' + selectedFiles.map((file, index) => {
        const url = URL.createObjectURL(file);
        return `
            <div class="preview-item">
                <img src="${url}" alt="Preview">
                <button class="remove-btn" onclick="removeFile(${index})">×</button>
            </div>
        `;
    }).join('') + '</div>';
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    displayPreviews();
}

async function uploadHighlights() {
    if (selectedFiles.length === 0) {
        alert('Iltimos, kamida bitta rasm tanlang');
        return;
    }
    
    const formData = new FormData();
    formData.append('calendar_id', currentCalendarId);
    selectedFiles.forEach(file => {
        formData.append('images', file);
    });
    
    const token = checkAuth();
    const response = await fetch(`${API_URL}/highlights/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    const data = await response.json();
    
    if (data && data.success) {
        alert(`${data.uploaded_count} ta rasm yuklandi!`);
        closeModal('highlightsModal');
        loadHighlights();
    }
}

// News
async function loadNews() {
    const data = await apiRequest('/news/all');
    if (!data) return;
    
    displayNews(data.news);
}

function displayNews(news) {
    const container = document.getElementById('newsList');
    
    if (news.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📰</div><p>Yangiliklar yo\'q</p></div>';
        return;
    }
    
    container.innerHTML = news.map(item => `
        <div class="news-card">
            <div class="news-card-header">
                <div>
                    <strong>${item.title}</strong>
                    <p style="color: #666; font-size: 12px; margin-top: 5px;">
                        ${new Date(item.created_at).toLocaleDateString('uz-UZ')}
                    </p>
                </div>
                <div class="news-actions">
                    <span class="order-status ${item.published ? 'status-accepted' : 'status-rejected'}">
                        ${item.published ? 'Nashr qilingan' : 'Yashirilgan'}
                    </span>
                    <button class="btn btn-small btn-secondary" onclick="editNews(${item.id})">✏️ Tahrirlash</button>
                    <button class="btn btn-small btn-danger" onclick="deleteNews(${item.id})">🗑️</button>
                </div>
            </div>
            <p style="margin-top: 10px; color: #666;">${item.content.substring(0, 150)}...</p>
            ${item.image_path ? `<img src="http://localhost:3000${item.image_path}" style="width: 200px; margin-top: 10px; border-radius: 8px;">` : ''}
        </div>
    `).join('');
}

function showAddNewsModal() {
    document.getElementById('newsModalTitle').textContent = 'Yangilik qo\'shish';
    document.getElementById('newsForm').reset();
    document.getElementById('newsId').value = '';
    document.getElementById('currentImagePreview').innerHTML = '';
    showModal('newsModal');
}

async function editNews(newsId) {
    const data = await apiRequest(`/news/${newsId}`);
    if (!data) return;
    
    const news = data.news;
    
    document.getElementById('newsModalTitle').textContent = 'Yangilikni tahrirlash';
    document.getElementById('newsId').value = news.id;
    document.getElementById('newsTitle').value = news.title;
    document.getElementById('newsContent').value = news.content;
    document.getElementById('newsPublished').checked = news.published === 1;
    
    if (news.image_path) {
        document.getElementById('currentImagePreview').innerHTML = `
            <img src="http://localhost:3000${news.image_path}" style="width: 200px; margin-top: 10px; border-radius: 8px;">
        `;
    }
    
    showModal('newsModal');
}

document.getElementById('newsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newsId = document.getElementById('newsId').value;
    const formData = new FormData();
    formData.append('title', document.getElementById('newsTitle').value);
    formData.append('content', document.getElementById('newsContent').value);
    formData.append('published', document.getElementById('newsPublished').checked ? '1' : '0');
    
    const imageFile = document.getElementById('newsImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    const token = checkAuth();
    const url = newsId ? `${API_URL}/news/${newsId}` : `${API_URL}/news`;
    const method = newsId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    const data = await response.json();
    
    if (data && data.success) {
        alert(newsId ? 'Yangilik yangilandi!' : 'Yangilik qo\'shildi!');
        closeModal('newsModal');
        loadNews();
    }
});

async function deleteNews(newsId) {
    if (!confirm('Yangilikni o\'chirmoqchimisiz?')) return;
    
    const data = await apiRequest(`/news/${newsId}`, { method: 'DELETE' });
    
    if (data && data.success) {
        alert('Yangilik o\'chirildi');
        loadNews();
    }
}

// Modal helpers
function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Utility functions
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
}