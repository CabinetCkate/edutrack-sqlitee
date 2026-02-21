const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Уақыт белдеуін орнату
process.env.TZ = 'Asia/Almaty';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(path.join(__dirname, 'database', 'edutrack.db'), (err) => {
    if (err) {
        console.error('Деректер қорына қосылу қатесі:', err.message);
    } else {
        console.log('Деректер қорына сәтті қосылды');
        createTables();
    }
});

function createTables() {
    console.log('Кестелер құрылуда...');
    
    db.serialize(() => {
        // Студенттер кестесі - updated_at ЖОҚ
        db.run(`
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                group_name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Студенттер кестесін құру қатесі:', err.message);
            else console.log('✓ Студенттер кестесі дайын');
        });

        // Пәндер кестесі
        db.run(`
            CREATE TABLE IF NOT EXISTS subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Пәндер кестесін құру қатесі:', err.message);
            else console.log('✓ Пәндер кестесі дайын');
        });

        // Қатысу кестесі
        db.run(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                subject_id INTEGER NOT NULL,
                date DATE NOT NULL,
                status TEXT CHECK(status IN ('present', 'late', 'absent')) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                UNIQUE(student_id, subject_id, date)
            )
        `, (err) => {
            if (err) console.error('Қатысу кестесін құру қатесі:', err.message);
            else console.log('✓ Қатысу кестесі дайын');
        });

        // Лог кестесі
        db.run(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                description TEXT NOT NULL,
                user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Лог кестесін құру қатесі:', err.message);
            else console.log('✓ Лог кестесі дайын');
        });
    });

    setTimeout(() => {
        insertInitialData();
    }, 500);
}

function insertInitialData() {
    // Студенттерді тексеру
    db.get("SELECT COUNT(*) as count FROM students", (err, row) => {
        if (err) {
            console.error('Студенттерді тексеру қатесі:', err.message);
            return;
        }
        
        if (row.count === 0) {
            console.log('Бастапқы студенттер қосылуда...');
            const students = [
                ['Әбдиева Қарлығаш', 'karlygash@mail.com', 'ИС-201'],
                ['Тоқтамыс Алуа', 'alua@mail.com', 'ИС-201'],
                ['Тлекұлы Асыл', 'asyl@mail.com', 'ИС-202'],
                ['Тоқтамұрат Жанболат', 'zhanbolat@mail.com', 'ИС-202']
            ];
            
            const stmt = db.prepare("INSERT INTO students (name, email, group_name) VALUES (?, ?, ?)");
            students.forEach(s => {
                stmt.run(s, function(err) {
                    if (err) console.error('Студент қосу қатесі:', err.message);
                });
            });
            stmt.finalize();
            console.log('✓ Бастапқы студенттер қосылды');
        }
    });

    // Пәндерді тексеру
    db.get("SELECT COUNT(*) as count FROM subjects", (err, row) => {
        if (err) {
            console.error('Пәндерді тексеру қатесі:', err.message);
            return;
        }
        
        if (row.count === 0) {
            console.log('Бастапқы пәндер қосылуда...');
            const subjects = [
                ['Бағдарламалау', 'Java негіздері'],
                ['Мәліметтер қоры', 'SQLite, MySQL'],
                ['Веб-бағдарламалау', 'HTML, CSS, JavaScript']
            ];
            
            const stmt = db.prepare("INSERT INTO subjects (name, description) VALUES (?, ?)");
            subjects.forEach(s => {
                stmt.run(s, function(err) {
                    if (err) console.error('Пән қосу қатесі:', err.message);
                });
            });
            stmt.finalize();
            console.log('✓ Бастапқы пәндер қосылды');
        }
    });
}

// ========== API МАРШРУТТАРЫ ==========

// Студенттер API
app.get('/api/students', (req, res) => {
    const { group, search } = req.query;
    let sql = "SELECT * FROM students";
    const params = [];
    
    if (group) {
        sql += " WHERE group_name = ?";
        params.push(group);
    }
    
    if (search) {
        sql += group ? " AND" : " WHERE";
        sql += " (name LIKE ? OR email LIKE ? OR group_name LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    sql += " ORDER BY name";
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/students', (req, res) => {
    const { name, email, group_name } = req.body;
    
    if (!name || !email || !group_name) {
        res.status(400).json({ error: 'Барлық өрістерді толтырыңыз' });
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Дұрыс email енгізіңіз' });
        return;
    }
    
    // Аты-жөні бойынша тексеру
    db.get(
        "SELECT * FROM students WHERE LOWER(name) = LOWER(?)",
        [name],
        (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (row) {
                res.status(400).json({ error: 'Бұл аты-жөнімен студент басқа топта тіркелген!' });
                return;
            }
            
            // Email бойынша тексеру
            db.get(
                "SELECT * FROM students WHERE LOWER(email) = LOWER(?)",
                [email],
                (err, emailRow) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    
                    if (emailRow) {
                        res.status(400).json({ error: 'Бұл email тіркелген' });
                        return;
                    }
                    
                    // Студентті қосу
                    db.run(
                        "INSERT INTO students (name, email, group_name) VALUES (?, ?, ?)",
                        [name, email, group_name],
                        function(err) {
                            if (err) {
                                res.status(500).json({ error: err.message });
                                return;
                            }
                            
                            // Лог жазу
                            db.run(
                                "INSERT INTO activity_logs (action_type, description) VALUES (?, ?)",
                                ['ADD_STUDENT', `Жаңа студент қосылды: ${name} (${group_name})`]
                            );
                            
                            db.get("SELECT * FROM students WHERE id = ?", [this.lastID], (err, row) => {
                                if (err) {
                                    res.status(500).json({ error: err.message });
                                    return;
                                }
                                res.json(row);
                            });
                        }
                    );
                }
            );
        }
    );
});

app.delete('/api/students/:id', (req, res) => {
    db.get("SELECT * FROM students WHERE id = ?", [req.params.id], (err, student) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        db.run("DELETE FROM students WHERE id = ?", [req.params.id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Студент табылмады' });
                return;
            }
            
            db.run(
                "INSERT INTO activity_logs (action_type, description) VALUES (?, ?)",
                ['DELETE_STUDENT', `Студент өшірілді: ${student.name}`]
            );
            
            res.json({ message: 'Студент өшірілді', id: req.params.id });
        });
    });
});

// Пәндер API
app.get('/api/subjects', (req, res) => {
    db.all("SELECT * FROM subjects ORDER BY name", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/subjects', (req, res) => {
    const { name, description } = req.body;
    
    if (!name) {
        res.status(400).json({ error: 'Пән атын енгізіңіз' });
        return;
    }
    
    db.run(
        "INSERT INTO subjects (name, description) VALUES (?, ?)",
        [name, description || ''],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    res.status(400).json({ error: 'Бұл пән бар' });
                } else {
                    res.status(500).json({ error: err.message });
                }
                return;
            }
            
            db.run(
                "INSERT INTO activity_logs (action_type, description) VALUES (?, ?)",
                ['ADD_SUBJECT', `Жаңа пән қосылды: ${name}`]
            );
            
            db.get("SELECT * FROM subjects WHERE id = ?", [this.lastID], (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json(row);
            });
        }
    );
});

app.delete('/api/subjects/:id', (req, res) => {
    db.get("SELECT * FROM subjects WHERE id = ?", [req.params.id], (err, subject) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        db.run("DELETE FROM subjects WHERE id = ?", [req.params.id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Пән табылмады' });
                return;
            }
            
            db.run(
                "INSERT INTO activity_logs (action_type, description) VALUES (?, ?)",
                ['DELETE_SUBJECT', `Пән өшірілді: ${subject.name}`]
            );
            
            res.json({ message: 'Пән өшірілді', id: req.params.id });
        });
    });
});

// Қатысу API
app.get('/api/attendance', (req, res) => {
    const { student_id, subject_id, start_date, end_date, date, group } = req.query;
    
    let sql = `
        SELECT a.*, s.name as student_name, s.group_name, sub.name as subject_name 
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN subjects sub ON a.subject_id = sub.id
        WHERE 1=1
    `;
    const params = [];
    
    if (student_id && student_id !== 'all') {
        sql += " AND a.student_id = ?";
        params.push(student_id);
    }
    
    if (subject_id && subject_id !== 'all') {
        sql += " AND a.subject_id = ?";
        params.push(subject_id);
    }
    
    if (group && group !== 'all') {
        sql += " AND s.group_name = ?";
        params.push(group);
    }
    
    if (date) {
        sql += " AND a.date = ?";
        params.push(date);
    }
    
    if (start_date) {
        sql += " AND a.date >= ?";
        params.push(start_date);
    }
    
    if (end_date) {
        sql += " AND a.date <= ?";
        params.push(end_date);
    }
    
    sql += " ORDER BY a.date DESC";
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/attendance', (req, res) => {
    const { student_id, subject_id, date, status } = req.body;
    
    if (!student_id || !subject_id || !date || !status) {
        res.status(400).json({ error: 'Барлық өрістерді толтырыңыз' });
        return;
    }
    
    db.run(
        "INSERT OR REPLACE INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)",
        [student_id, subject_id, date, status],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            db.get(`
                SELECT a.*, s.name as student_name, s.group_name, sub.name as subject_name 
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                JOIN subjects sub ON a.subject_id = sub.id
                WHERE a.id = ?
            `, [this.lastID], (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json(row);
            });
        }
    );
});

// Статистика API
app.get('/api/stats', (req, res) => {
    const stats = {};
    
    db.get("SELECT COUNT(*) as count FROM students", (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        stats.students = row.count;
        
        db.get("SELECT COUNT(*) as count FROM subjects", (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            stats.subjects = row.count;
            
            db.get("SELECT COUNT(*) as count FROM attendance", (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                stats.attendance = row.count;
                
                db.get(`
                    SELECT 
                        AVG(CASE 
                            WHEN status = 'present' THEN 100 
                            WHEN status = 'late' THEN 50 
                            ELSE 0 
                        END) as avg_percentage
                    FROM attendance
                `, (err, row) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    stats.avgAttendance = Math.round(row.avg_percentage || 0) + '%';
                    res.json(stats);
                });
            });
        });
    });
});

app.get('/api/logs', (req, res) => {
    const { limit = 10 } = req.query;
    
    db.all(
        "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?",
        [limit],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

app.get('/api/groups', (req, res) => {
    db.all("SELECT DISTINCT group_name FROM students ORDER BY group_name", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows.map(r => r.group_name));
    });
});

app.listen(PORT, () => {
    console.log(`Сервер http://localhost:${PORT} портында жұмыс істейді`);
});

process.on('SIGINT', () => {
    db.close(() => {
        console.log('Деректер қоры жабылды');
        process.exit(0);
    });
});