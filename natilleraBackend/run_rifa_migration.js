
const { query, pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'update_rifa_schema.sql'), 'utf8');
        await query(sql);
        console.log('Rifa schema updated successfully');
    } catch (e) {
        console.error('Error updating schema:', e);
    } finally {
        pool.end();
    }
}

run();
