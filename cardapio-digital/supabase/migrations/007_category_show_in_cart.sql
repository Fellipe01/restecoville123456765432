-- Add show_in_cart flag to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS show_in_cart BOOLEAN NOT NULL DEFAULT FALSE;
