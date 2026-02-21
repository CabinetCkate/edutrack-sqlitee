// Глобалды айнымалылар
let currentReportData = {
    attendance: [],
    students: [],
    subjects: []
};

// Есеп фильтрлерін жүктеу
async function loadReportFilters() {
    try {
        const [students, subjects, groups] = await Promise.all([
            apiGet(`${API_URL}/students`),
            apiGet(`${API_URL}/subjects`),
            apiGet(`${API_URL}/groups`)
        ]);
        
        // Топтар селекты
        const groupSelect = document.getElementById('reportGroup');
        if (groupSelect) {
            groupSelect.innerHTML = '<option value="all">Барлық топтар</option>';
            groups.forEach(g => {
                groupSelect.innerHTML += `<option value="${g}">${g}</option>`;
            });
        }
        
        // Студенттер селекты
        const studentSelect = document.getElementById('reportStudent');
        if (studentSelect) {
            studentSelect.innerHTML = '<option value="all">Барлық студенттер</option>';
            students.forEach(s => {
                studentSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.group_name})</option>`;
            });
        }
        
        // Пәндер селекты
        const subjectSelect = document.getElementById('reportSubject');
        if (subjectSelect) {
            subjectSelect.innerHTML = '<option value="all">Барлық пәндер</option>';
            subjects.forEach(s => {
                subjectSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
        
        // Күндерді орнату
        const now = new Date();
        const almatyDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Almaty' }));
        
        const startOfMonth = new Date(almatyDate.getFullYear(), almatyDate.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(almatyDate.getFullYear(), almatyDate.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const startDate = document.getElementById('reportStartDate');
        const endDate = document.getElementById('reportEndDate');
        
        if (startDate) startDate.value = startOfMonth;
        if (endDate) endDate.value = endOfMonth;
        
    } catch (error) {
        console.error('Есеп фильтрлерін жүктеу қатесі:', error);
    }
}

// Есеп жасау
window.generateReport = async function() {
    const studentId = document.getElementById('reportStudent')?.value || 'all';
    const subjectId = document.getElementById('reportSubject')?.value || 'all';
    const groupName = document.getElementById('reportGroup')?.value || 'all';
    const startDate = document.getElementById('reportStartDate')?.value || '';
    const endDate = document.getElementById('reportEndDate')?.value || '';
    const reportType = document.getElementById('reportType')?.value || 'summary';
    
    try {
        showLoading();
        
        // Қатысу деректерін жүктеу
        let url = `${API_URL}/attendance?`;
        const params = [];
        
        if (studentId && studentId !== 'all') params.push(`student_id=${studentId}`);
        if (subjectId && subjectId !== 'all') params.push(`subject_id=${subjectId}`);
        if (groupName && groupName !== 'all') params.push(`group=${encodeURIComponent(groupName)}`);
        if (startDate) params.push(`start_date=${startDate}`);
        if (endDate) params.push(`end_date=${endDate}`);
        
        url += params.join('&');
        
        const [attendance, students, subjects] = await Promise.all([
            apiGet(url),
            apiGet(`${API_URL}/students`),
            apiGet(`${API_URL}/subjects`)
        ]);
        
        // Деректерді сақтау
        currentReportData = {
            attendance,
            students,
            subjects
        };
        
        const resultDiv = document.getElementById('reportResult');
        if (!resultDiv) return;
        
        // Есеп түрін таңдау
        if (reportType === 'summary') {
            showSummaryReport(resultDiv, attendance, students, subjects, studentId, subjectId, groupName, startDate, endDate);
        } else if (reportType === 'detailed') {
            showDetailedReport(resultDiv, attendance, students, subjects, studentId, subjectId, groupName, startDate, endDate);
        } else if (reportType === 'chart') {
            showChartReport(resultDiv, attendance, students, subjects, studentId, subjectId, groupName, startDate, endDate);
        }
        
        showToast('Есеп сәтті жасалды!', 'success');
        
    } catch (error) {
        console.error('Есеп жасау қатесі:', error);
        showToast('Есеп жасау кезінде қате орын алды', 'error');
    } finally {
        hideLoading();
    }
};

// Жиынтық есеп
function showSummaryReport(container, attendance, students, subjects, studentId, subjectId, groupName, startDate, endDate) {
    if (attendance.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <h3>Деректер жоқ</h3>
                <p>Таңдалған кезеңде қатысу деректері жоқ</p>
            </div>
        `;
        return;
    }
    
    // Жалпы статистика
    const totalRecords = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const lateCount = attendance.filter(a => a.status === 'late').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    
    const presentPercent = totalRecords > 0 ? ((presentCount + lateCount * 0.5) / totalRecords * 100).toFixed(1) : '0';
    
    // Бірегей студенттер саны
    const uniqueStudents = new Set(attendance.map(a => a.student_id)).size;
    const uniqueSubjects = new Set(attendance.map(a => a.subject_id)).size;
    
    let html = `
        <div class="report-content">
            <h2 class="report-main-title">
                <i class="fas fa-chart-pie"></i> 
                Қатысу есебі
                <small>${new Date().toLocaleDateString('kk-KZ')}</small>
            </h2>
            
            <div class="report-filters-info">
                ${groupName !== 'all' ? `<span class="filter-badge"><i class="fas fa-users"></i> Топ: ${groupName}</span>` : ''}
                ${studentId !== 'all' ? `<span class="filter-badge"><i class="fas fa-user-graduate"></i> ${getStudentName(students, studentId)}</span>` : ''}
                ${subjectId !== 'all' ? `<span class="filter-badge"><i class="fas fa-book"></i> ${getSubjectName(subjects, subjectId)}</span>` : ''}
                <span class="filter-badge"><i class="fas fa-calendar"></i> ${startDate || '?'} - ${endDate || '?'}</span>
            </div>
            
            <div class="report-stats-grid">
                <div class="report-stat-card total">
                    <div class="stat-icon"><i class="fas fa-database"></i></div>
                    <div class="stat-details">
                        <span class="stat-value">${totalRecords}</span>
                        <span class="stat-label">Барлық жазба</span>
                    </div>
                </div>
                <div class="report-stat-card">
                    <div class="stat-icon"><i class="fas fa-users"></i></div>
                    <div class="stat-details">
                        <span class="stat-value">${uniqueStudents}</span>
                        <span class="stat-label">Студенттер</span>
                    </div>
                </div>
                <div class="report-stat-card">
                    <div class="stat-icon"><i class="fas fa-book"></i></div>
                    <div class="stat-details">
                        <span class="stat-value">${uniqueSubjects}</span>
                        <span class="stat-label">Пәндер</span>
                    </div>
                </div>
                <div class="report-stat-card present">
                    <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-details">
                        <span class="stat-value">${presentCount}</span>
                        <span class="stat-label">Қатысқан</span>
                    </div>
                </div>
                <div class="report-stat-card late">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-details">
                        <span class="stat-value">${lateCount}</span>
                        <span class="stat-label">Кешіккен</span>
                    </div>
                </div>
                <div class="report-stat-card absent">
                    <div class="stat-icon"><i class="fas fa-times-circle"></i></div>
                    <div class="stat-details">
                        <span class="stat-value">${absentCount}</span>
                        <span class="stat-label">Қатыспаған</span>
                    </div>
                </div>
            </div>
            
            <div class="report-progress-section">
                <h3>Жалпы қатысу көрсеткіші</h3>
                <div class="report-progress-bar">
                    <div class="progress-fill" style="width: ${presentPercent}%">
                        <span class="progress-text">${presentPercent}%</span>
                    </div>
                </div>
            </div>
    `;
    
    // Пәндер бойынша статистика
    html += '<h3 class="section-title">Пәндер бойынша қатысу</h3>';
    html += '<div class="subjects-stats">';
    
    subjects.forEach(subject => {
        const subjectAttendance = attendance.filter(a => a.subject_id === subject.id);
        if (subjectAttendance.length === 0) return;
        
        const subPresent = subjectAttendance.filter(a => a.status === 'present').length;
        const subLate = subjectAttendance.filter(a => a.status === 'late').length;
        const subAbsent = subjectAttendance.filter(a => a.status === 'absent').length;
        const subTotal = subjectAttendance.length;
        const subPercent = subTotal > 0 ? ((subPresent + subLate * 0.5) / subTotal * 100).toFixed(1) : '0';
        
        let percentColor = '#4cc9f0';
        if (subPercent < 50) percentColor = '#f72585';
        else if (subPercent < 70) percentColor = '#f8961e';
        
        html += `
            <div class="subject-stat-card">
                <div class="subject-header">
                    <h4><i class="fas fa-book"></i> ${subject.name}</h4>
                    <span class="subject-total">${subTotal} сабақ</span>
                </div>
                <div class="subject-stats">
                    <div class="stat-row">
                        <span><i class="fas fa-check-circle" style="color: #4cc9f0;"></i> ${subPresent}</span>
                        <span><i class="fas fa-clock" style="color: #f8961e;"></i> ${subLate}</span>
                        <span><i class="fas fa-times-circle" style="color: #f72585;"></i> ${subAbsent}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${subPercent}%; background: ${percentColor};"></div>
                    </div>
                    <div class="percent-value" style="color: ${percentColor};">
                        ${subPercent}%
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Студенттер бойынша статистика
    html += '<h3 class="section-title">Студенттер бойынша қатысу</h3>';
    html += '<div class="students-stats">';
    
    if (studentId === 'all') {
        students.forEach(student => {
            const studentAttendance = attendance.filter(a => a.student_id === student.id);
            if (studentAttendance.length === 0) return;
            
            const studPresent = studentAttendance.filter(a => a.status === 'present').length;
            const studLate = studentAttendance.filter(a => a.status === 'late').length;
            const studAbsent = studentAttendance.filter(a => a.status === 'absent').length;
            const studTotal = studentAttendance.length;
            const studPercent = studTotal > 0 ? ((studPresent + studLate * 0.5) / studTotal * 100).toFixed(1) : '0';
            
            let percentColor = '#4cc9f0';
            if (studPercent < 50) percentColor = '#f72585';
            else if (studPercent < 70) percentColor = '#f8961e';
            
            html += `
                <div class="student-stat-card">
                    <div class="student-info">
                        <div class="student-avatar">${student.name.charAt(0)}</div>
                        <div class="student-details">
                            <div class="student-name">${student.name}</div>
                            <div class="student-group">${student.group_name}</div>
                        </div>
                    </div>
                    <div class="student-stats">
                        <div class="stats-badges">
                            <span class="badge present"><i class="fas fa-check-circle"></i> ${studPresent}</span>
                            <span class="badge late"><i class="fas fa-clock"></i> ${studLate}</span>
                            <span class="badge absent"><i class="fas fa-times-circle"></i> ${studAbsent}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${studPercent}%; background: ${percentColor};"></div>
                        </div>
                        <div class="percent-value" style="color: ${percentColor};">
                            ${studPercent}%
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        const student = students.find(s => s.id == studentId);
        if (student) {
            const studentAttendance = attendance.filter(a => a.student_id == studentId);
            
            const subjectsMap = new Map();
            studentAttendance.forEach(a => {
                const subject = subjects.find(s => s.id === a.subject_id);
                if (!subject) return;
                
                if (!subjectsMap.has(subject.id)) {
                    subjectsMap.set(subject.id, {
                        name: subject.name,
                        present: 0,
                        late: 0,
                        absent: 0,
                        total: 0
                    });
                }
                
                const data = subjectsMap.get(subject.id);
                data[a.status]++;
                data.total++;
            });
            
            for (let [subjectId, data] of subjectsMap) {
                const percent = data.total > 0 ? ((data.present + data.late * 0.5) / data.total * 100).toFixed(1) : '0';
                let percentColor = '#4cc9f0';
                if (percent < 50) percentColor = '#f72585';
                else if (percent < 70) percentColor = '#f8961e';
                
                html += `
                    <div class="student-stat-card">
                        <div class="student-info">
                            <div class="student-avatar">${student.name.charAt(0)}</div>
                            <div class="student-details">
                                <div class="student-name">${student.name}</div>
                                <div class="student-group">${student.group_name}</div>
                            </div>
                        </div>
                        <div class="student-stats">
                            <h4>${data.name}</h4>
                            <div class="stats-badges">
                                <span class="badge present"><i class="fas fa-check-circle"></i> ${data.present}</span>
                                <span class="badge late"><i class="fas fa-clock"></i> ${data.late}</span>
                                <span class="badge absent"><i class="fas fa-times-circle"></i> ${data.absent}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${percent}%; background: ${percentColor};"></div>
                            </div>
                            <div class="percent-value" style="color: ${percentColor};">
                                ${percent}%
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    html += '</div></div>';
    
    // Excel-ге экспорттау батырмасы
    html += `
        <div class="report-actions">
            <button class="btn btn-success" onclick="exportToExcel()">
                <i class="fas fa-file-excel"></i> Excel-ге экспорттау
            </button>
            <button class="btn btn-primary" onclick="saveReportToDatabase()">
                <i class="fas fa-save"></i> Есепті сақтау
            </button>
            <button class="btn btn-secondary" onclick="window.print()">
                <i class="fas fa-print"></i> Басып шығару
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// Толық есеп
function showDetailedReport(container, attendance, students, subjects, studentId, subjectId, groupName, startDate, endDate) {
    if (attendance.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-table"></i>
                <h3>Деректер жоқ</h3>
                <p>Таңдалған кезеңде қатысу деректері жоқ</p>
            </div>
        `;
        return;
    }
    
    attendance.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = `
        <div class="report-content">
            <h2 class="report-main-title">
                <i class="fas fa-list"></i> 
                Толық қатысу тізімі
                <small>${new Date().toLocaleDateString('kk-KZ')}</small>
            </h2>
            
            <div class="report-filters-info">
                ${groupName !== 'all' ? `<span class="filter-badge"><i class="fas fa-users"></i> Топ: ${groupName}</span>` : ''}
                ${studentId !== 'all' ? `<span class="filter-badge"><i class="fas fa-user-graduate"></i> ${getStudentName(students, studentId)}</span>` : ''}
                ${subjectId !== 'all' ? `<span class="filter-badge"><i class="fas fa-book"></i> ${getSubjectName(subjects, subjectId)}</span>` : ''}
                <span class="filter-badge"><i class="fas fa-calendar"></i> ${startDate || '?'} - ${endDate || '?'}</span>
            </div>
            
            <div class="detailed-table-container">
                <table class="detailed-table">
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Күн</th>
                            <th>Студент</th>
                            <th>Топ</th>
                            <th>Пән</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    attendance.forEach((record, index) => {
        const student = students.find(s => s.id === record.student_id);
        const subject = subjects.find(s => s.id === record.subject_id);
        
        if (!student || !subject) return;
        
        const statusText = {
            'present': 'Қатысты',
            'late': 'Кешікті',
            'absent': 'Қатыспады'
        }[record.status];
        
        const statusIcon = {
            'present': 'fa-check-circle',
            'late': 'fa-clock',
            'absent': 'fa-times-circle'
        }[record.status];
        
        const statusClass = {
            'present': 'status-present',
            'late': 'status-late',
            'absent': 'status-absent'
        }[record.status];
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${record.date}</td>
                <td>
                    <div class="student-info">
                        <div class="student-avatar" style="width: 30px; height: 30px; font-size: 12px;">${student.name.charAt(0)}</div>
                        <span>${student.name}</span>
                    </div>
                </td>
                <td><span class="student-group-badge">${student.group_name}</span></td>
                <td>${subject.name}</td>
                <td><span class="status-badge ${statusClass}"><i class="fas ${statusIcon}"></i> ${statusText}</span></td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
            
            <div class="table-footer">
                <p>Барлығы: <strong>${attendance.length}</strong> жазба</p>
            </div>
            
            <div class="report-actions">
                <button class="btn btn-success" onclick="exportToExcel()">
                    <i class="fas fa-file-excel"></i> Excel-ге экспорттау
                </button>
                <button class="btn btn-primary" onclick="saveReportToDatabase()">
                    <i class="fas fa-save"></i> Есепті сақтау
                </button>
                <button class="btn btn-secondary" onclick="window.print()">
                    <i class="fas fa-print"></i> Басып шығару
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Графиктік есеп
function showChartReport(container, attendance, students, subjects, studentId, subjectId, groupName, startDate, endDate) {
    if (attendance.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <h3>Деректер жоқ</h3>
                <p>Таңдалған кезеңде қатысу деректері жоқ</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="report-content">
            <h2 class="report-main-title">
                <i class="fas fa-chart-bar"></i> 
                Графиктік есеп
                <small>${new Date().toLocaleDateString('kk-KZ')}</small>
            </h2>
            
            <div class="report-filters-info">
                ${groupName !== 'all' ? `<span class="filter-badge"><i class="fas fa-users"></i> Топ: ${groupName}</span>` : ''}
                ${studentId !== 'all' ? `<span class="filter-badge"><i class="fas fa-user-graduate"></i> ${getStudentName(students, studentId)}</span>` : ''}
                ${subjectId !== 'all' ? `<span class="filter-badge"><i class="fas fa-book"></i> ${getSubjectName(subjects, subjectId)}</span>` : ''}
                <span class="filter-badge"><i class="fas fa-calendar"></i> ${startDate || '?'} - ${endDate || '?'}</span>
            </div>
    `;
    
    const dates = [...new Set(attendance.map(a => a.date))].sort();
    
    html += '<h3 class="section-title">Күндер бойынша қатысу</h3>';
    html += '<div class="chart-container">';
    
    dates.forEach(date => {
        const dayAttendance = attendance.filter(a => a.date === date);
        const dayPresent = dayAttendance.filter(a => a.status === 'present').length;
        const dayLate = dayAttendance.filter(a => a.status === 'late').length;
        const dayAbsent = dayAttendance.filter(a => a.status === 'absent').length;
        const dayTotal = dayAttendance.length;
        
        const presentPercent = dayTotal > 0 ? (dayPresent / dayTotal * 100).toFixed(1) : 0;
        const latePercent = dayTotal > 0 ? (dayLate / dayTotal * 100).toFixed(1) : 0;
        const absentPercent = dayTotal > 0 ? (dayAbsent / dayTotal * 100).toFixed(1) : 0;
        
        html += `
            <div class="chart-row">
                <div class="chart-date">${date}</div>
                <div class="chart-bars">
                    <div class="bar-stack">
                        <div class="bar present" style="width: ${presentPercent}%;" title="Қатысты: ${dayPresent}"></div>
                        <div class="bar late" style="width: ${latePercent}%;" title="Кешікті: ${dayLate}"></div>
                        <div class="bar absent" style="width: ${absentPercent}%;" title="Қатыспады: ${dayAbsent}"></div>
                    </div>
                    <div class="bar-values">
                        <span style="color: #4cc9f0;">${dayPresent}</span>
                        <span style="color: #f8961e;">${dayLate}</span>
                        <span style="color: #f72585;">${dayAbsent}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    html += `
        <div class="chart-legend">
            <span><span class="legend-color" style="background: #4cc9f0;"></span> Қатысты</span>
            <span><span class="legend-color" style="background: #f8961e;"></span> Кешікті</span>
            <span><span class="legend-color" style="background: #f72585;"></span> Қатыспады</span>
        </div>
        
        <div class="report-actions">
            <button class="btn btn-success" onclick="exportToExcel()">
                <i class="fas fa-file-excel"></i> Excel-ге экспорттау
            </button>
            <button class="btn btn-primary" onclick="saveReportToDatabase()">
                <i class="fas fa-save"></i> Есепті сақтау
            </button>
            <button class="btn btn-secondary" onclick="window.print()">
                <i class="fas fa-print"></i> Басып шығару
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// Есепті сақтау
window.saveReportToDatabase = function() {
    const now = new Date();
    const almatyTime = now.toLocaleString('kk-KZ', { timeZone: 'Asia/Almaty' });
    
    const reportData = {
        timestamp: almatyTime,
        filters: {
            studentId: document.getElementById('reportStudent')?.value || 'all',
            subjectId: document.getElementById('reportSubject')?.value || 'all',
            groupName: document.getElementById('reportGroup')?.value || 'all',
            startDate: document.getElementById('reportStartDate')?.value || '',
            endDate: document.getElementById('reportEndDate')?.value || '',
            reportType: document.getElementById('reportType')?.value || 'summary'
        },
        data: currentReportData
    };
    
    const savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    savedReports.push({
        id: Date.now(),
        name: `Есеп ${almatyTime}`,
        data: reportData
    });
    localStorage.setItem('savedReports', JSON.stringify(savedReports));
    
    showToast('Есеп сәтті сақталды!', 'success');
};

// Excel-ге экспорттау
window.exportToExcel = function() {
    const { attendance, students, subjects } = currentReportData;
    
    if (attendance.length === 0) {
        showToast('Экспорттау үшін деректер жоқ', 'error');
        return;
    }
    
    let csv = 'Күн,Студент,Топ,Пән,Статус\n';
    
    attendance.forEach(a => {
        const student = students.find(s => s.id === a.student_id);
        const subject = subjects.find(s => s.id === a.subject_id);
        
        if (student && subject) {
            const statusText = {
                'present': 'Қатысты',
                'late': 'Кешікті',
                'absent': 'Қатыспады'
            }[a.status];
            
            csv += `"${a.date}","${student.name}","${student.group_name}","${subject.name}","${statusText}"\n`;
        }
    });
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `qatysu_esebi_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('Excel файлы жүктелді!', 'success');
};

// Көмекші функциялар
function getStudentName(students, studentId) {
    if (studentId === 'all') return 'Барлық студенттер';
    const student = students.find(s => s.id == studentId);
    return student ? student.name : 'Белгісіз';
}

function getSubjectName(subjects, subjectId) {
    if (subjectId === 'all') return 'Барлық пәндер';
    const subject = subjects.find(s => s.id == subjectId);
    return subject ? subject.name : 'Белгісіз';
}

// Батырмаларды орнату
document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateReportBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateReport);
    }
});