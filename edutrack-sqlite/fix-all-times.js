const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/edutrack.db');

console.log('Қолданыстағы деректерді түзету...');

db.serialize(() => {
    // Студенттерді түзету (04-05 сағаттарын 09-10 сағатқа ауыстыру)
    db.run(
        "UPDATE students SET created_at = datetime(created_at, '+5 hours') WHERE strftime('%H', created_at) < '06'",
        function(err) {
            if (err) console.error('Қате:', err);
            else console.log(`✓ Студенттер түзетілді: ${this.changes} жазба`);
        }
    );
    
    // Пәндерді түзету
    db.run(
        "UPDATE subjects SET created_at = datetime(created_at, '+5 hours') WHERE strftime('%H', created_at) < '06'",
        function(err) {
            if (err) console.error('Қате:', err);
            else console.log(`✓ Пәндер түзетілді: ${this.changes} жазба`);
        }
    );
    
    // Қатысуларды түзету
    db.run(
        "UPDATE attendance SET created_at = datetime(created_at, '+5 hours') WHERE strftime('%H', created_at) < '06'",
        function(err) {
            if (err) console.error('Қате:', err);
            else console.log(`✓ Қатысулар түзетілді: ${this.changes} жазба`);
        }
    );
    
    // Логтарды түзету
    db.run(
        "UPDATE activity_logs SET created_at = datetime(created_at, '+5 hours') WHERE strftime('%H', created_at) < '06'",
        function(err) {
            if (err) console.error('Қате:', err);
            else console.log(`✓ Логтар түзетілді: ${this.changes} жазба`);
        }
    );
});

setTimeout(() => {
    console.log('\n✅ Барлық түзетулер аяқталды!');
    db.close();
}, 2000);