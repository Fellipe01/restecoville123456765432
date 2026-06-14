export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Restaurant {
  id: string
  name: string
  logo_url: string | null
  primary_color: string
  is_open: boolean
  operation_mode: 'balcao' | 'delivery' | 'ambos'
  whatsapp_number: string | null
  estimated_time_balcao: number
  estimated_time_delivery: number
  city: string
  lat: number | null
  lng: number | null
  delivery_base_radius_km: number | null
  delivery_base_fee: number | null
  delivery_extra_fee_per_km: number | null
  delivery_max_radius_km: number | null
  created_at: string
}

export interface Deliverer {
  id: string
  restaurant_id: string
  name: string
  phone: string | null
  is_active: boolean
}

export interface BusinessHours {
  id: string
  restaurant_id: string
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

export interface Category {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  show_in_cart: boolean
  created_at: string
}

export interface VariationGroup {
  id: string
  product_id: string
  name: string
  required: boolean
  min_selections: number
  max_selections: number
  sort_order: number
  variations?: Variation[]
}

export interface Variation {
  id: string
  group_id: string
  name: string
  price_modifier: number
  is_available: boolean
  sort_order: number
  image_url?: string | null
  description?: string | null
}

export interface AddonGroup {
  id: string
  product_id: string
  name: string
  required: boolean
  min_selections: number
  max_selections: number
  sort_order: number
  addons?: Addon[]
}

export interface Addon {
  id: string
  addon_group_id: string
  name: string
  price: number
  is_available: boolean
  sort_order: number
}

export interface ComboItem {
  id: string
  combo_id: string
  name: string
  quantity: number
  sort_order: number
}

export interface Product {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description: string | null
  image_url: string | null
  base_price: number
  is_available: boolean
  sort_order: number
  type: 'simple' | 'combo'
  created_at: string
  category?: Category
  variation_groups?: VariationGroup[]
  addon_groups?: AddonGroup[]
  combo_items?: ComboItem[]
}

export interface DeliveryZone {
  id: string
  restaurant_id: string
  name: string
  fee: number
  estimated_minutes: number
  minimum_order: number
  is_active: boolean
}

export interface Coupon {
  id: string
  restaurant_id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_value: number
  max_uses: number | null
  uses_count: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

export type OrderStatus = 'recebido' | 'preparando' | 'pronto' | 'saindo' | 'entregue' | 'cancelado'
export type OrderType = 'balcao' | 'delivery'
export type PaymentMethod = 'dinheiro' | 'debito' | 'credito'

export interface Order {
  id: string
  restaurant_id: string
  order_number: number
  customer_name: string
  customer_phone: string
  type: OrderType
  status: OrderStatus
  table_number: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  delivery_zone_id: string | null
  delivery_fee: number
  subtotal: number
  total: number
  notes: string | null
  payment_method: PaymentMethod
  troco: number | null
  estimated_ready_at: string | null
  coupon_code: string | null
  discount_amount: number
  scheduled_for: string | null
  created_at: string
  updated_at: string
  deliverer_id?: string | null
  group_id?: string | null
  items?: OrderItem[]
  delivery_zone?: DeliveryZone
  deliverer?: Deliverer
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  notes: string | null
  product?: Product
  addons?: OrderItemAddon[]
  variations?: OrderItemVariation[]
}

export interface OrderItemAddon {
  id: string
  order_item_id: string
  addon_id: string
  addon_name: string
  price: number
}

export interface OrderItemVariation {
  id: string
  order_item_id: string
  variation_id: string
  variation_name: string
  group_name: string
  price_modifier: number
}

// Cart types
export interface CartItemAddon {
  addon_id: string
  addon_name: string
  price: number
}

export interface CartItemVariation {
  variation_id: string
  variation_name: string
  group_name: string
  group_id: string
  price_modifier: number
  image_url?: string | null
}

export interface CartItem {
  id: string
  product_id: string
  product_name: string
  image_url: string | null
  base_price: number
  quantity: number
  unit_price: number
  notes: string
  addons: CartItemAddon[]
  variations: CartItemVariation[]
}

export interface CartState {
  items: CartItem[]
  customer_name: string
  customer_phone: string
  order_type: OrderType
  table_number: string
  address: string
  delivery_fee: number
  notes: string
  payment_method: PaymentMethod
  troco: string
}
