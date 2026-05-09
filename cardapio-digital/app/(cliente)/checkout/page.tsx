export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { BusinessHours, Restaurant } from '@/types'
import CheckoutClient from '@/components/cliente/checkout-client'
import Link from 'next/link'
import { Clock } from 'lucide-react'

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

export default async function CheckoutPage() {
  const supabase = await createClient()

  const [{ data: restaurant }, { data: hours }] = await Promise.all([
    supabase.from('restaurants').select('*').single(),
    supabase.from('business_hours').select('*').order('day_of_week'),
  ])

  const isOpen = computeIsOpen((hours ?? []) as BusinessHours[])

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
