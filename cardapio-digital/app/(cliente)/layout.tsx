import CartFab from '@/components/cliente/cart-fab'
import SessionTracker from '@/components/cliente/session-tracker'
import { createClient } from '@/lib/supabase/server'
import { computeIsOpen } from '@/lib/business-hours'
import { getRestaurantId, getRestaurantWithHours } from '@/lib/restaurant'

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const restaurantId = await getRestaurantId()
  const { restaurant, businessHours } = restaurantId
    ? await getRestaurantWithHours(supabase, restaurantId)
    : { restaurant: null, businessHours: [] }
  const isOpen = restaurant ? (computeIsOpen(businessHours) ?? true) : true

  return (
    <div className="min-h-screen bg-gray-50">
      {restaurant?.id && <SessionTracker restaurantId={restaurant.id} />}
      {children}
      <CartFab isOpen={isOpen} />
    </div>
  )
}
