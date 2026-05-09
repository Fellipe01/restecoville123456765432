import CartFab from '@/components/cliente/cart-fab'
import SessionTracker from '@/components/cliente/session-tracker'
import { createClient } from '@/lib/supabase/server'
import { BusinessHours } from '@/types'

function computeIsOpen(hours: BusinessHours[]): boolean {
  if (!hours.length) return true
  const now = new Date()
  let dayOfWeek = now.getUTCDay()
  let currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() - 3 * 60
  if (currentMinutes < 0) { currentMinutes += 24 * 60; dayOfWeek = (dayOfWeek - 1 + 7) % 7 }
  const today = hours.find((h) => h.day_of_week === dayOfWeek)
  if (!today || today.is_closed) return false
  const [openH, openM] = today.open_time.split(':').map(Number)
  const [closeH, closeM] = today.close_time.split(':').map(Number)
  return currentMinutes >= openH * 60 + openM && currentMinutes <= closeH * 60 + closeM
}

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: restaurant } = await supabase.from('restaurants').select('id, is_open').single()
  const { data: hours } = await supabase.from('business_hours').select('*').order('day_of_week')
  const isOpen = restaurant ? computeIsOpen((hours ?? []) as BusinessHours[]) : true

  return (
    <div className="min-h-screen bg-gray-50">
      {restaurant?.id && <SessionTracker restaurantId={restaurant.id} />}
      {children}
      <CartFab isOpen={isOpen} />
    </div>
  )
}
