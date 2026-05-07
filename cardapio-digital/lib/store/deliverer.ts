import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DelivererSession {
  id: string
  name: string
  phone: string | null
  restaurant_id: string
}

interface DelivererStore {
  session: DelivererSession | null
  token: string | null           // JWT assinado pelo servidor
  _hydrated: boolean
  setSession: (s: DelivererSession, token: string) => void
  clearSession: () => void
  setHydrated: (v: boolean) => void
}

export const useDelivererStore = create<DelivererStore>()(
  persist(
    (set) => ({
      session: null,
      token: null,
      _hydrated: false,
      setSession: (session, token) => set({ session, token }),
      clearSession: () => set({ session: null, token: null }),
      setHydrated: (v) => set({ _hydrated: v }),
    }),
    {
      name: 'entregador-session',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)
