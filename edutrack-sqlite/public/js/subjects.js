// Пәндерді жүктеу
async function loadSubjects() {
    try {
        const subjects = await apiGet(`${API_URL}/subjects`);
        const grid = document.getElementById('subjectsGrid');
        
        if (!grid) return;
        
        if (!subjects || subjects.length === 0) {
            grid.innerHTML = '<div style="text-align: center; padding: 40px;">Пәндер жоқ</div>';
            return;
        }
        
        grid.innerHTML = subjects.map(s => `
            <div class="subject-card">
                <div class="subject-icon"><i class="fas fa-book"></i></div>
                <h3>${s.name || 'Аты жоқ'}</h3>
                <p>${s.description || 'Сипаттама жоқ'}</p>
                <button class="btn btn-sm btn-danger" onclick="deleteSubject(${s.id})">
                    <i class="fas fa-trash"></i> Өшіру
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Пәндерді жүктеу қатесі:', error);
    }
}

// Пән қосу
window.addSubject = async function() {
    const name = document.getElementById('subjectName')?.value.trim();
    const description = document.getElementById('subjectDescription')?.value.trim();
    
    if (!name) {
        showToast('Пән атын енгізіңіз!', 'error');
        return;
    }
    
    try {
        await apiPost(`${API_URL}/subjects`, { name, description });
        
        document.getElementById('subjectName').value = '';
        document.getElementById('subjectDescription').value = '';
        
        closeModal('subjectModal');
        await loadSubjects();
        await loadDashboard();
        showToast('Пән қосылды!');
    } catch (error) {
        console.error('Пән қосу қатесі:', error);
    }
};

// Пән өшіру
window.deleteSubject = async function(id) {
    if (!confirm('Пәнді өшіруге сенімдісіз бе?')) return;
    
    try {
        await apiDelete(`${API_URL}/subjects/${id}`);
        await loadSubjects();
        await loadDashboard();
        showToast('Пән өшірілді!');
    } catch (error) {
        console.error('Пән өшіру қатесі:', error);
    }
};

// Батырмаларды орнату
document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('addSubjectBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openModal('subjectModal'));
    }
    
    const saveBtn = document.getElementById('saveSubjectBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', addSubject);
    }
    
    const closeBtn = document.getElementById('closeSubjectModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal('subjectModal'));
    }
    
    const cancelBtn = document.getElementById('cancelSubjectBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeModal('subjectModal'));
    }
});