const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🔄 Starting WhatsApp schema migration...');

        const sqlPath = path.join(__dirname, 'update_whatsapp_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        console.log('✅ WhatsApp schema migration completed successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
