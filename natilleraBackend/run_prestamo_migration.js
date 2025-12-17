const { query, pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'update_prestamos_codes.sql'), 'utf8');
        await query(sql);
        console.log('✅ Prestamos codes migration successful');
    } catch (e) {
        console.error('❌ Error in migration:', e);
    } finally {
        pool.end();
    }
}

run();
