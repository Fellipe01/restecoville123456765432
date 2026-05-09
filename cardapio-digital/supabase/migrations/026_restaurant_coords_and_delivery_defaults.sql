-- Migration 026: set restaurant coordinates and delivery config defaults
-- Coordinates for the restaurant location used in haversine distance calculation

UPDATE restaurants
SET
  lat = -11.7278604,
  lng = -49.0277786,
  delivery_base_radius_km  = COALESCE(delivery_base_radius_km,  3),
  delivery_base_fee        = COALESCE(delivery_base_fee,        5),
  delivery_extra_fee_per_km = COALESCE(delivery_extra_fee_per_km, 2),
  delivery_max_radius_km   = COALESCE(delivery_max_radius_km,   15)
WHERE lat IS NULL OR lat = 0;
