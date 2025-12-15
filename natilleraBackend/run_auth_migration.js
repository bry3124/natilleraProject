
const { query, pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'create_users.sql'), 'utf8');
        await query(sql);
        console.log('Users table created successfully');
    } catch (e) {
        console.error('Error creating users table:', e);
    } finally {
        pool.end();
    }
}

run();
