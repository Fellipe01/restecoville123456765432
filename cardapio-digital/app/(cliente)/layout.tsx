import CartFab from '@/components/cliente/cart-fab'
import SessionTracker from '@/components/cliente/session-tracker'
import { createClient } from '@/lib/supabase/server'
import { BusinessHours } from '@/types'
import { computeIsOpen } from '@/lib/business-hours'
import { getRestaurantId } from '@/lib/restaurant'

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const restaurantId = await getRestaurantId()
  const { data: restaurant } = restaurantId
    ? await supabase.from('restaurants').select('id, is_open').eq('id', restaurantId).single()
    : { data: null }
  const { data: hours } = restaurantId
    ? await supabase.from('business_hours').select('*').eq('restaurant_id', restaurantId).order('day_of_week')
    : { data: null }
  const isOpen = restaurant ? (computeIsOpen((hours ?? []) as BusinessHours[]) ?? true) : true

  return (
    <div className="min-h-screen bg-gray-50">
      {restaurant?.id && <SessionTracker restaurantId={restaurant.id} />}
      {children}
      <CartFab isOpen={isOpen} />
    </div>
  )
}
