const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { query } = require('./config/db');

// Initialize the client with LocalAuth for session persistence
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;

function initWhatsApp() {
    console.log('🔄 Initializing WhatsApp Client...');

    client.on('qr', (qr) => {
        console.log('⚠️  QR Code received! Scan this with your WhatsApp:');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('✅ WhatsApp Client is ready!');
        isReady = true;
    });

    client.on('authenticated', () => {
        console.log('✅ WhatsApp Authenticated!');
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ WhatsApp Authentication failure:', msg);
    });

    client.on('disconnected', (reason) => {
        console.warn('⚠️ WhatsApp Client was disconnected:', reason);
        isReady = false;
        // Optional: client.initialize(); // Auto-reconnect
    });

    client.initialize();
}

/**
 * Format phone number to WhatsApp ID (573001234567@c.us)
 * @param {string} phone 
 * @returns {string|null}
 */
function formatPhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');

    // Assume Colombian numbers (10 digits starting with 3)
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
        return `57${cleaned}@c.us`;
    }

    // Already has country code 57
    if (cleaned.length === 12 && cleaned.startsWith('57')) {
        return `${cleaned}@c.us`;
    }

    // Fallback: trust the number but append suffix
    return `${cleaned}@c.us`;
}

/**
 * Send WhatsApp Message
 * @param {object} socio 
 * @param {string} message 
 * @returns {Promise<object>}
 */
async function sendWhatsAppMessage(socio, message) {
    if (!isReady) {
        console.warn('⚠️ WhatsApp client not ready. Message queued or skipped.');
        return { success: false, error: 'Client not ready' };
    }

    if (!socio.whatsapp_enabled) {
        return { success: false, error: 'WhatsApp disabled for user' };
    }

    const chatId = formatPhoneNumber(socio.telefono);
    if (!chatId) {
        return { success: false, error: 'Invalid phone number' };
    }

    try {
        const response = await client.sendMessage(chatId, message);
        console.log(`✅ WhatsApp sent to ${chatId}`);

        // Log to DB
        await query(
            'INSERT INTO whatsapp_logs (socio_id, telefono, mensaje, sid, status) VALUES ($1, $2, $3, $4, $5)',
            [socio.id, chatId, message, response.id.id, 'sent']
        );

        return { success: true, id: response.id.id };
    } catch (error) {
        console.error(`❌ Error sending WhatsApp to ${chatId}:`, error.message);

        await query(
            'INSERT INTO whatsapp_logs (socio_id, telefono, mensaje, error_message, status) VALUES ($1, $2, $3, $4, $5)',
            [socio.id, chatId, message, error.message, 'failed']
        );

        return { success: false, error: error.message };
    }
}

module.exports = {
    initWhatsApp,
    sendWhatsAppMessage
};
