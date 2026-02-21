// Глобалды айнымалылар
let currentGroup = '';
let currentSubject = '';
let currentDate = '';

// Фильтрлерді жүктеу
async function loadFilters() {
    try {
        const [students, subjects] = await Promise.all([
            apiGet(`${API_URL}/students`),
            apiGet(`${API_URL}/subjects`)
        ]);
        
        // Топтарды алу (студенттерден бірегей топтарды шығару)
        const groups = [...new Set(students.map(s => s.group_name))].sort();
        
        // Топ фильтрі
        const filterGroup = document.getElementById('filterGroup');
        if (filterGroup) {
            filterGroup.innerHTML = '<option value="">Топты таңдаңыз</option>';
            groups.forEach(g => {
                filterGroup.innerHTML += `<option value="${g}">${g}</option>`;
            });
        }
        
        // Пән фильтрі
        const filterSubject = document.getElementById('filterSubject');
        if (filterSubject) {
            filterSubject.innerHTML = '<option value="">Пәнді таңдаңыз</option>';
            subjects.forEach(s => {
                filterSubject.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
        
        // Күн (Алматы уақыты бойынша бүгінгі күн)
        const now = new Date();
        const almatyDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Almaty' }));
        const today = almatyDate.toISOString().split('T')[0];
        
        const filterDate = document.getElementById('filterDate');
        if (filterDate) {
            filterDate.value = today;
            currentDate = today;
        }
        
        // Модальдағы селекттер
        const attSubject = document.getElementById('attendanceSubject');
        if (attSubject) {
            attSubject.innerHTML = '<option value="">Пәнді таңдаңыз</option>';
            subjects.forEach(s => {
                attSubject.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
        
    } catch (error) {
        console.error('Фильтрлерді жүктеу қатесі:', error);
    }
}

// Топ таңдалғанда студенттерді көрсету
async function loadGroupStudents() {
    const groupSelect = document.getElementById('filterGroup');
    const subjectSelect = document.getElementById('filterSubject');
    const dateInput = document.getElementById('filterDate');
    const studentsContainer = document.getElementById('studentsAttendanceContainer');
    
    if (!groupSelect || !subjectSelect || !dateInput || !studentsContainer) return;
    
    const group = groupSelect.value;
    const subjectId = subjectSelect.value;
    const date = dateInput.value;
    
    currentGroup = group;
    currentSubject = subjectId;
    currentDate = date;
    
    if (!group || !subjectId || !date) {
        studentsContainer.innerHTML = getEmptyStateMessage(group, subjectId, date);
        return;
    }
    
    try {
        // Топтағы студенттерді алу
        const students = await apiGet(`${API_URL}/students?group=${encodeURIComponent(group)}`);
        
        if (students.length === 0) {
            studentsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h3>Бұл топта студенттер жоқ</h3>
                    <p>"${group}" тобына студенттер қосыңыз</p>
                </div>
            `;
            return;
        }
        
        // Бүгінгі қатысуларды алу
        const attendance = await apiGet(`${API_URL}/attendance?date=${date}&subject_id=${subjectId}`);
        
        // Статистика
        const presentCount = students.filter(s => {
            const att = attendance.find(a => a.student_id === s.id);
            return att && att.status === 'present';
        }).length;
        
        const lateCount = students.filter(s => {
            const att = attendance.find(a => a.student_id === s.id);
            return att && att.status === 'late';
        }).length;
        
        const absentCount = students.filter(s => {
            const att = attendance.find(a => a.student_id === s.id);
            return att && att.status === 'absent';
        }).length;
        
        // Студенттер тізімін құру
        let html = `
            <div class="attendance-stats">
                <div class="stat-item">
                    <span class="stat-label">Барлығы:</span>
                    <span class="stat-value">${students.length}</span>
                </div>
                <div class="stat-item present">
                    <span class="stat-label">Қатысты:</span>
                    <span class="stat-value">${presentCount}</span>
                </div>
                <div class="stat-item late">
                    <span class="stat-label">Кешікті:</span>
                    <span class="stat-value">${lateCount}</span>
                </div>
                <div class="stat-item absent">
                    <span class="stat-label">Қатыспады:</span>
                    <span class="stat-value">${absentCount}</span>
                </div>
            </div>
            <div class="attendance-table-container">
                <table class="attendance-students-table">
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Студент</th>
                            <th>Email</th>
                            <th>Қатысу</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        students.forEach((student, index) => {
            const studentAttendance = attendance.find(a => a.student_id === student.id);
            const currentStatus = studentAttendance ? studentAttendance.status : '';
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <div class="student-info">
                            <div class="student-avatar">${student.name.charAt(0)}</div>
                            <div>
                                <div class="student-name">${student.name}</div>
                                <div class="student-email">${student.email}</div>
                            </div>
                        </div>
                    </td>
                    <td>${student.email}</td>
                    <td>
                        <div class="attendance-status-buttons">
                            <button class="status-btn ${currentStatus === 'present' ? 'active' : ''}" 
                                    onclick="markAttendance(${student.id}, ${subjectId}, 'present', '${date}')">
                                <i class="fas fa-check-circle"></i>
                                Қатысты
                            </button>
                            <button class="status-btn late ${currentStatus === 'late' ? 'active' : ''}" 
                                    onclick="markAttendance(${student.id}, ${subjectId}, 'late', '${date}')">
                                <i class="fas fa-clock"></i>
                                Кешікті
                            </button>
                            <button class="status-btn absent ${currentStatus === 'absent' ? 'active' : ''}" 
                                    onclick="markAttendance(${student.id}, ${subjectId}, 'absent', '${date}')">
                                <i class="fas fa-times-circle"></i>
                                Қатыспады
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        studentsContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Топ студенттерін жүктеу қатесі:', error);
        studentsContainer.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Қате орын алды</h3>
                <p>Қайтадан көріңіз</p>
            </div>
        `;
    }
}

// Бос хабарлама
function getEmptyStateMessage(group, subject, date) {
    if (!group && !subject && !date) {
        return `
            <div class="empty-state">
                <i class="fas fa-hand-pointer"></i>
                <h3>Параметрлерді таңдаңыз</h3>
                <p>Топ, пән және күн таңдаңыз</p>
            </div>
        `;
    } else if (!group) {
        return `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>Топ таңдалмаған</h3>
                <p>Жоғарыдан топты таңдаңыз</p>
            </div>
        `;
    } else if (!subject) {
        return `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <h3>Пән таңдалмаған</h3>
                <p>Жоғарыдан пәнді таңдаңыз</p>
            </div>
        `;
    } else if (!date) {
        return `
            <div class="empty-state">
                <i class="fas fa-calendar-alt"></i>
                <h3>Күн таңдалмаған</h3>
                <p>Жоғарыдан күнді таңдаңыз</p>
            </div>
        `;
    }
}

// Қатысу белгілеу
window.markAttendance = async function(studentId, subjectId, status, date) {
    try {
        await apiPost(`${API_URL}/attendance`, {
            student_id: studentId,
            subject_id: subjectId,
            date: date,
            status: status
        });
        
        // Бетті жаңарту
        await loadGroupStudents();
        await loadDashboard();
        await loadLogs();
        showToast('Қатысу белгіленді!', 'success');
        
    } catch (error) {
        console.error('Қатысу белгілеу қатесі:', error);
        if (error.message.includes('UNIQUE') || error.message.includes('бар')) {
            try {
                const attendance = await apiGet(`${API_URL}/attendance?student_id=${studentId}&subject_id=${subjectId}&date=${date}`);
                if (attendance.length > 0) {
                    await apiDelete(`${API_URL}/attendance/${attendance[0].id}`);
                    await apiPost(`${API_URL}/attendance`, {
                        student_id: studentId,
                        subject_id: subjectId,
                        date: date,
                        status: status
                    });
                    await loadGroupStudents();
                    await loadLogs();
                    showToast('Қатысу жаңартылды!', 'success');
                }
            } catch (updateError) {
                showToast('Қате орын алды!', 'error');
            }
        } else {
            showToast('Қате орын алды!', 'error');
        }
    }
};

// Батырмаларды орнату
document.addEventListener('DOMContentLoaded', () => {
    // Фильтрлер
    const filterGroup = document.getElementById('filterGroup');
    const filterSubject = document.getElementById('filterSubject');
    const filterDate = document.getElementById('filterDate');
    
    if (filterGroup) filterGroup.addEventListener('change', loadGroupStudents);
    if (filterSubject) filterSubject.addEventListener('change', loadGroupStudents);
    if (filterDate) filterDate.addEventListener('change', loadGroupStudents);
    
    // Бастапқы жүктеу
    loadFilters();
});

// Глобалды функциялар
window.loadLogs = async function() {
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
};

window.loadDashboard = async function() {
    try {
        const stats = await apiGet(`${API_URL}/stats`);
        document.getElementById('totalStudents').textContent = stats.students || 0;
        document.getElementById('totalSubjects').textContent = stats.subjects || 0;
        document.getElementById('totalAttendance').textContent = stats.attendance || 0;
        document.getElementById('avgAttendance').textContent = stats.avgAttendance || '0%';
    } catch (error) {
        console.error('Статистика жүктеу қатесі:', error);
    }
};