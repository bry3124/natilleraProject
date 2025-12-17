-- Add whatsapp_enabled column to socios
ALTER TABLE socios ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT TRUE;

-- Create whatsapp_logs table
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id SERIAL PRIMARY KEY,
    socio_id INTEGER REFERENCES socios(id) ON DELETE SET NULL,
    telefono VARCHAR(50),
    mensaje TEXT,
    sid VARCHAR(100), -- Twilio Message SID
    status VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for logs
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_socio ON whatsapp_logs(socio_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON whatsapp_logs(created_at);
