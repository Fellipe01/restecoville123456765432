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
  created_at: string
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
  created_at: string
  category?: Category
  variation_groups?: VariationGroup[]
  addon_groups?: AddonGroup[]
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

export type OrderStatus = 'recebido' | 'preparando' | 'pronto' | 'entregue' | 'cancelado'
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
  delivery_zone_id: string | null
  delivery_fee: number
  subtotal: number
  total: number
  notes: string | null
  payment_method: PaymentMethod
  troco: number | null
  estimated_ready_at: string | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
  delivery_zone?: DeliveryZone
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
  delivery_zone_id: string
  delivery_fee: number
  notes: string
  payment_method: PaymentMethod
  troco: string
}
