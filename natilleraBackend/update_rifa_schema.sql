
-- Ensure tables exist (if not already)
CREATE TABLE IF NOT EXISTS rifas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_evento DATE NOT NULL,
    frecuencia VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rifa_numeros (
    id SERIAL PRIMARY KEY,
    rifa_id INTEGER REFERENCES rifas(id) ON DELETE CASCADE,
    numero VARCHAR(5) NOT NULL,
    precio DECIMAL(10,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'DISPONIBLE',
    nombre_cliente VARCHAR(255),
    telefono_cliente VARCHAR(50),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Check and add columns if they are missing (Postgres syntax)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rifa_numeros' AND column_name='telefono_cliente') THEN
        ALTER TABLE rifa_numeros ADD COLUMN telefono_cliente VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rifa_numeros' AND column_name='nombre_cliente') THEN
        ALTER TABLE rifa_numeros ADD COLUMN nombre_cliente VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rifa_numeros' AND column_name='estado') THEN
        ALTER TABLE rifa_numeros ADD COLUMN estado VARCHAR(20) DEFAULT 'DISPONIBLE';
    END IF;
END $$;
