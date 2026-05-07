ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8) NULL;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8) NULL;

-- Coordenadas do Ecoville
UPDATE restaurants SET lat = -11.7278604, lng = -49.0277786;
