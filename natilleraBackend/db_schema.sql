-- Database schema additions for Natillera redesign
-- Run this script to add new tables for eventos and prestamos

-- Create eventos table
CREATE TABLE IF NOT EXISTS eventos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  tipo VARCHAR(50) DEFAULT 'GENERAL',
  estado VARCHAR(50) DEFAULT 'UPCOMING',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create prestamos table
CREATE TABLE IF NOT EXISTS prestamos (
  id SERIAL PRIMARY KEY,
  socio_id INTEGER NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
  monto DECIMAL(12,2) NOT NULL,
  tasa_interes DECIMAL(5,2) DEFAULT 0,
  fecha_solicitud DATE DEFAULT CURRENT_DATE,
  fecha_aprobacion DATE,
  fecha_vencimiento DATE,
  plazo_meses INTEGER DEFAULT 12,
  estado VARCHAR(50) DEFAULT 'PENDIENTE',
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create prestamos_pagos table for tracking loan payments
CREATE TABLE IF NOT EXISTS prestamos_pagos (
  id SERIAL PRIMARY KEY,
  prestamo_id INTEGER NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  fecha_pago DATE NOT NULL,
  monto_pago DECIMAL(12,2) NOT NULL,
  forma_pago VARCHAR(50),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_estado ON eventos(estado);
CREATE INDEX IF NOT EXISTS idx_prestamos_socio ON prestamos(socio_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(estado);
CREATE INDEX IF NOT EXISTS idx_prestamos_pagos_prestamo ON prestamos_pagos(prestamo_id);

-- Add some sample data for testing
INSERT INTO eventos (nombre, descripcion, fecha, tipo, estado) VALUES
  ('Reunión Mensual', 'Reunión ordinaria de socios', CURRENT_DATE + INTERVAL '5 days', 'REUNION', 'UPCOMING'),
  ('Rifa Navideña', 'Rifa especial de fin de año', CURRENT_DATE + INTERVAL '20 days', 'RIFA', 'UPCOMING'),
  ('Pago de Utilidades', 'Distribución de ganancias', CURRENT_DATE + INTERVAL '30 days', 'PAGO', 'UPCOMING'),
  ('Asamblea General', 'Asamblea anual de socios', CURRENT_DATE - INTERVAL '10 days', 'ASAMBLEA', 'COMPLETED'),
  ('Evento Social', 'Integración de socios', CURRENT_DATE - INTERVAL '5 days', 'SOCIAL', 'COMPLETED')
ON CONFLICT DO NOTHING;

-- WhatsApp Integration
ALTER TABLE socios ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id SERIAL PRIMARY KEY,
    socio_id INTEGER REFERENCES socios(id) ON DELETE SET NULL,
    telefono VARCHAR(50),
    mensaje TEXT,
    sid VARCHAR(100),
    status VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_socio ON whatsapp_logs(socio_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON whatsapp_logs(created_at);
