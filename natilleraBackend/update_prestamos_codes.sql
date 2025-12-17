-- Migration to add unique codes to loans
ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) UNIQUE;

-- Populate existing loans with a default code format PRE-[ID]
UPDATE prestamos SET codigo = 'PRE-' || LPAD(id::text, 4, '0') WHERE codigo IS NULL;
