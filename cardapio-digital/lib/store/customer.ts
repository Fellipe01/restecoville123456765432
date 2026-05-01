import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CustomerStore {
  phone: string
  setPhone: (phone: string) => void
  clearPhone: () => void
}

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set) => ({
      phone: '',
      setPhone: (phone) => set({ phone }),
      clearPhone: () => set({ phone: '' }),
    }),
    { name: 'cardapio-customer' }
  )
)
