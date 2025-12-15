
-- Add numero_ganador to rifas table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rifas' AND column_name='numero_ganador') THEN
        ALTER TABLE rifas ADD COLUMN numero_ganador VARCHAR(5);
    END IF;
END $$;
