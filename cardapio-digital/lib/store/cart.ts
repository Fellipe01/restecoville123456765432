import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, CartItemAddon, CartItemVariation, OrderType, PaymentMethod } from '@/types'

interface CartStore {
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

  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  setCustomer: (name: string, phone: string) => void
  setOrderType: (type: OrderType) => void
  setDelivery: (fee: number, address: string) => void
  setTableNumber: (table: string) => void
  setNotes: (notes: string) => void
  setPayment: (method: PaymentMethod, troco: string) => void

  getSubtotal: () => number
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      customer_name: '',
      customer_phone: '',
      order_type: 'balcao',
      table_number: '',
      address: '',
      delivery_zone_id: '',
      delivery_fee: 0,
      notes: '',
      payment_method: 'dinheiro',
      troco: '',

      addItem: (item) => {
        const id = `${item.product_id}-${Date.now()}`
        set((state) => ({ items: [...state.items, { ...item, id }] }))
      },

      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        }))
      },

      clearCart: () => set({ items: [], notes: '', table_number: '', address: '', delivery_fee: 0, payment_method: 'dinheiro', troco: '' }),

      setCustomer: (name, phone) => set({ customer_name: name, customer_phone: phone }),

      setOrderType: (type) => set({ order_type: type }),

      setDelivery: (fee, address) => set({ delivery_fee: fee, address }),

      setTableNumber: (table) => set({ table_number: table }),

      setNotes: (notes) => set({ notes }),

      setPayment: (method, troco) => set({ payment_method: method, troco }),

      getSubtotal: () => {
        return get().items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0)
      },

      getTotal: () => {
        return get().getSubtotal() + get().delivery_fee
      },

      getItemCount: () => {
        return get().items.reduce((acc, item) => acc + item.quantity, 0)
      },
    }),
    {
      name: 'cardapio-cart',
      partialize: (state) => ({
        items: state.items,
        customer_name: state.customer_name,
        customer_phone: state.customer_phone,
      }),
    }
  )
)

export function calculateItemPrice(
  basePrice: number,
  variations: CartItemVariation[],
  addons: CartItemAddon[]
): number {
  const variationTotal = variations.reduce((acc, v) => acc + v.price_modifier, 0)
  const addonTotal = addons.reduce((acc, a) => acc + a.price, 0)
  return basePrice + variationTotal + addonTotal
}
