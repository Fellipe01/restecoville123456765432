-- Migration 025: radius-based delivery config
-- Replaces per-neighborhood zones with a single radius model:
--   base_fee applies for distances up to base_radius_km
--   beyond that: base_fee + (distance - base_radius) * extra_fee_per_km
--   orders beyond max_radius_km are rejected

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS delivery_base_radius_km  numeric DEFAULT 3,
  ADD COLUMN IF NOT EXISTS delivery_base_fee        numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS delivery_extra_fee_per_km numeric DEFAULT 2,
  ADD COLUMN IF NOT EXISTS delivery_max_radius_km   numeric DEFAULT 15;
