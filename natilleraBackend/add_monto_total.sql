-- Add monto_total column to prestamos table
ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS monto_total DECIMAL(12,2);

-- Update existing records to calculate monto_total
-- Formula: monto_total = monto * (1 + tasa_interes/100)
UPDATE prestamos 
SET monto_total = monto * (1 + COALESCE(tasa_interes, 0) / 100)
WHERE monto_total IS NULL;
