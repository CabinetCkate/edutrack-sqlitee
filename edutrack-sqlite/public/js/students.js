// Студенттерді жүктеу
async function loadStudents() {
    try {
        const searchInput = document.getElementById('searchStudent');
        const searchTerm = searchInput ? searchInput.value : '';
        
        let url = `${API_URL}/students`;
        if (searchTerm) {
            url += `?search=${encodeURIComponent(searchTerm)}`;
        }
        
        const students = await apiGet(url);
        const tbody = document.getElementById('studentsList');
        
        if (!tbody) return;
        
        if (!students || students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;"><i class="fas fa-users" style="font-size: 48px; color: #ccc; margin-bottom: 10px;"></i><br>Студенттер жоқ</td></tr>';
            return;
        }
        
        tbody.innerHTML = students.map((s, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <div class="student-info">
                        <div class="student-avatar">${s.name ? s.name.charAt(0) : '?'}</div>
                        <div class="student-details">
                            <span class="student-name">${s.name || 'Аты-жөні жоқ'}</span>
                            <span class="student-email">${s.email || ''}</span>
                        </div>
                    </div>
                </td>
                <td>${s.email || ''}</td>
                <td><span class="student-group-badge"><i class="fas fa-users"></i> ${s.group_name || ''}</span></td>
                <td>${formatAlmatyDate(s.created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteStudent(${s.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Студенттерді жүктеу қатесі:', error);
    }
}

// Алматы уақыты бойынша датаны форматтау
function formatAlmatyDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        // Егер дата жарамсыз болса
        if (isNaN(date.getTime())) return '-';
        
        // Алматы уақыты бойынша форматтау
        return date.toLocaleDateString('kk-KZ', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Almaty'
        });
    } catch (e) {
        console.error('Дата форматтау қатесі:', e);
        return '-';
    }
}

// Студент қосу (бір адам бір ғана топта бола алады)
window.addStudent = async function() {
    const name = document.getElementById('studentName')?.value.trim();
    const email = document.getElementById('studentEmail')?.value.trim();
    const group = document.getElementById('studentGroup')?.value.trim();
    
    if (!name || !email || !group) {
        showToast('Барлық өрістерді толтырыңыз!', 'error');
        return;
    }
    
    // Email тексеру
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Дұрыс email енгізіңіз! (мысалы: name@domain.com)', 'error');
        return;
    }
    
    try {
        // Барлық студенттерді алу
        const students = await apiGet(`${API_URL}/students`);
        
        // 1. Аты-жөні бойынша тексеру (бір адам тек бір ғана топта бола алады)
        const existingName = students.find(s => s.name.toLowerCase() === name.toLowerCase());
        if (existingName) {
            showToast(`"${name}" есімді студент "${existingName.group_name}" тобында тіркелген! Бір адам тек бір ғана топта бола алады.`, 'error');
            return;
        }
        
        // 2. Email бойынша тексеру
        const existingEmail = students.find(s => s.email.toLowerCase() === email.toLowerCase());
        if (existingEmail) {
            showToast('Бұл email тіркелген!', 'error');
            return;
        }
        
        // Студентті қосу
        await apiPost(`${API_URL}/students`, {
            name,
            email,
            group_name: group
        });
        
        // Форманы тазалау
        document.getElementById('studentName').value = '';
        document.getElementById('studentEmail').value = '';
        document.getElementById('studentGroup').value = '';
        
        closeModal('studentModal');
        await loadStudents();
        await loadDashboard();
        await loadLogs();
        showToast('Студент қосылды!');
        
    } catch (error) {
        console.error('Студент қосу қатесі:', error);
        showToast(error.message || 'Қате орын алды!', 'error');
    }
};

// Студент өшіру
window.deleteStudent = async function(id) {
    if (!confirm('Студентті өшіруге сенімдісіз бе?')) return;
    
    try {
        await apiDelete(`${API_URL}/students/${id}`);
        await loadStudents();
        await loadDashboard();
        await loadLogs();
        showToast('Студент өшірілді!');
    } catch (error) {
        console.error('Студент өшіру қатесі:', error);
    }
};

// Топ бойынша студенттерді тексеру
async function checkGroupStudents() {
    const groupInput = document.getElementById('studentGroup');
    const groupList = document.getElementById('groupStudentsList');
    const groupStudentsDiv = document.getElementById('groupStudents');
    
    if (!groupInput || !groupList || !groupStudentsDiv) return;
    
    groupInput.addEventListener('input', async (e) => {
        const group = e.target.value.trim();
        
        if (group.length < 2) {
            groupList.style.display = 'none';
            return;
        }
        
        try {
            const students = await apiGet(`${API_URL}/students?group=${encodeURIComponent(group)}`);
            
            if (students.length > 0) {
                groupList.style.display = 'block';
                groupStudentsDiv.innerHTML = students.map(s => 
                    `<div style="padding: 5px; border-bottom: 1px solid #eee;">
                        <i class="fas fa-user"></i> ${s.name} (${s.email})
                    </div>`
                ).join('');
            } else {
                groupList.style.display = 'none';
            }
        } catch (error) {
            console.error('Топ студенттерін тексеру қатесі:', error);
        }
    });
}

// Логтарды жүктеу (соңғы әрекеттер)
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

// Іздеу
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchStudent');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                loadStudents();
            }, 500);
        });
    }
});

// Батырмаларды орнату
document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('addStudentBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openModal('studentModal'));
    }
    
    const saveBtn = document.getElementById('saveStudentBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', addStudent);
    }
    
    const closeBtn = document.getElementById('closeStudentModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal('studentModal'));
    }
    
    const cancelBtn = document.getElementById('cancelStudentBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeModal('studentModal'));
    }
    
    // Топ тексеруді бастау
    checkGroupStudents();
});