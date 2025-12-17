const cron = require('node-cron');
const { query } = require('./config/db');

// Example Cron Job: Daily check at 9:00 AM
// This addresses the user requirement "definir los cron jobs"
function initCronJobs() {
    console.log('⏰ Initializing Cron Jobs...');

    // Daily Task: Log system status or check due payments
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ Running daily cron job: System Check');
        try {
            // Placeholder: Check DB connection or count active users
            const { rows } = await query('SELECT count(*) FROM socios WHERE estado = $1', ['ACTIVO']);
            console.log(`ℹ️ Daily Report: ${rows[0].count} active socios.`);
        } catch (error) {
            console.error('❌ Error in daily cron job:', error.message);
        }
    });

    console.log('✅ Cron Jobs scheduled.');
}

module.exports = {
    initCronJobs
};
