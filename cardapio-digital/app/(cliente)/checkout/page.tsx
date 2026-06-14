export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { BusinessHours, Restaurant } from '@/types'
import CheckoutClient from '@/components/cliente/checkout-client'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { computeIsOpen } from '@/lib/business-hours'
import { getRestaurantId } from '@/lib/restaurant'
import { notFound } from 'next/navigation'

export default async function CheckoutPage() {
  const supabase = await createClient()
  const restaurantId = await getRestaurantId()
  if (!restaurantId) notFound()

  const [{ data: restaurant }, { data: hours }] = await Promise.all([
    supabase.from('restaurants').select('*').eq('id', restaurantId).single(),
    supabase.from('business_hours').select('*').eq('restaurant_id', restaurantId).order('day_of_week'),
  ])

  const isOpen = computeIsOpen((hours ?? []) as BusinessHours[]) ?? true

  if (!isOpen) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <Clock className="h-10 w-10 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurante fechado</h1>
          <p className="text-gray-500 text-sm">
            Não estamos aceitando pedidos no momento. Volte durante nosso horário de funcionamento.
          </p>
        </div>
        <Link
          href="/"
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-2xl transition-colors"
        >
          Ver cardápio
        </Link>
      </div>
    )
  }

  return (
    <CheckoutClient restaurant={restaurant as Restaurant} />
  )
}
