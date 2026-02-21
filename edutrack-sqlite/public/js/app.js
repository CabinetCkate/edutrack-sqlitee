// API базалық URL
const API_URL = 'http://localhost:3000/api';

// Глобалды айнымалылар
let currentPage = 'dashboard';
const toast = document.getElementById('toast');
const loading = document.getElementById('loading');

// Жүктеуді көрсету/жасыру
function showLoading() {
    if (loading) loading.classList.add('show');
}

function hideLoading() {
    if (loading) loading.classList.remove('show');
}

// Хабарландыру
function showToast(message, type = 'success') {
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Модалды басқару
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

// API сұраулары
async function apiRequest(url, options = {}) {
    showLoading();
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Қате орын алды');
        }
        
        return data;
    } catch (error) {
        showToast(error.message, 'error');
        console.error('API қате:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

async function apiGet(url) {
    return apiRequest(url);
}

async function apiPost(url, data) {
    return apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function apiDelete(url) {
    return apiRequest(url, {
        method: 'DELETE'
    });
}

// Бет ауыстыру
window.loadPage = async function(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageElement = document.getElementById(page + '-page');
    if (pageElement) pageElement.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) item.classList.add('active');
    });
    
    const titles = {
        'dashboard': 'Басты бет',
        'students': 'Студенттер',
        'subjects': 'Пәндер',
        'attendance': 'Қатысу',
        'reports': 'Есептер'
    };
    
    const titleElement = document.getElementById('currentPageTitle');
    if (titleElement) titleElement.textContent = titles[page];
    
    // Күнді көрсету (Алматы уақыты)
    const now = new Date();
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('kk-KZ', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'Asia/Almaty'
        });
    }
    
    // Бетке сәйкес деректерді жүктеу
    try {
        if (page === 'dashboard') {
            await loadDashboard();
            await loadLogs();
        }
        if (page === 'students') await loadStudents();
        if (page === 'subjects') await loadSubjects();
        if (page === 'attendance') {
            await loadFilters();
            const container = document.getElementById('studentsAttendanceContainer');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-hand-pointer"></i>
                        <h3>Параметрлерді таңдаңыз</h3>
                        <p>Топ, пән және күн таңдап, студенттердің қатысуын белгілеңіз</p>
                    </div>
                `;
            }
        }
        if (page === 'reports') await loadReportFilters();
    } catch (error) {
        console.error('Бет жүктеу қатесі:', error);
    }
    
    currentPage = page;
};

// Статистиканы жүктеу
async function loadDashboard() {
    try {
        const stats = await apiGet(`${API_URL}/stats`);
        document.getElementById('totalStudents').textContent = stats.students || 0;
        document.getElementById('totalSubjects').textContent = stats.subjects || 0;
        document.getElementById('totalAttendance').textContent = stats.attendance || 0;
        document.getElementById('avgAttendance').textContent = stats.avgAttendance || '0%';
    } catch (error) {
        console.error('Статистика жүктеу қатесі:', error);
    }
}

// Логтарды жүктеу
async function loadLogs() {
    try {
        const logs = await apiGet(`${API_URL}/logs?limit=10`);
        const container = document.getElementById('recentActivities');
        
        if (!container) return;
        
        if (!logs || logs.length === 0) {
            container.innerHTML = '<p class="empty-message">Әрекеттер жоқ</p>';
            return;
        }
        
        container.innerHTML = logs.map(log => {
            const date = new Date(log.created_at);
            
            // Алматы уақыты бойынша форматтау
            const timeStr = date.toLocaleTimeString('kk-KZ', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'Asia/Almaty'
            });
            
            const dateStr = date.toLocaleDateString('kk-KZ', { 
                day: '2-digit', 
                month: '2-digit',
                timeZone: 'Asia/Almaty'
            });
            
            let icon = 'fa-info-circle';
            let color = '#4361ee';
            
            if (log.action_type.includes('ADD')) {
                icon = 'fa-plus-circle';
                color = '#4cc9f0';
            } else if (log.action_type.includes('DELETE')) {
                icon = 'fa-trash';
                color = '#f72585';
            } else if (log.action_type.includes('ATTENDANCE')) {
                icon = 'fa-calendar-check';
                color = '#f8961e';
            }
            
            return `
                <div class="activity-item">
                    <i class="fas ${icon}" style="color: ${color};"></i>
                    <div class="activity-content">
                        <div class="activity-text">${log.description}</div>
                        <div class="activity-time">${dateStr} ${timeStr}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Логтарды жүктеу қатесі:', error);
    }
}

// Бастапқы жүктеу
document.addEventListener('DOMContentLoaded', () => {
    // Навигация
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            loadPage(page);
        });
    });
    
    // Басты бетті жүктеу
    loadPage('dashboard');
});