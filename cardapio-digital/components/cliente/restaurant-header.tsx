'use client'

import { Restaurant } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import Image from 'next/image'

interface Props {
  restaurant: Restaurant | null
  activeOrdersCount?: number
}

function dynamicTime(base: number, activeOrders: number): number {
  // +3 min por pedido ativo, máximo de 30 min extras
  const extra = Math.min(activeOrders * 3, 30)
  // Arredonda para o múltiplo de 5 mais próximo
  return Math.ceil((base + extra) / 5) * 5
}

export default function RestaurantHeader({ restaurant, activeOrdersCount = 0 }: Props) {
  if (!restaurant) return null

  const busy = activeOrdersCount >= 3
  const timeBalcao = dynamicTime(restaurant.estimated_time_balcao, activeOrdersCount)
  const timeDelivery = dynamicTime(restaurant.estimated_time_delivery, activeOrdersCount)

  return (
    <div className="bg-white shadow-sm">
      <div
        className="h-32 w-full"
        style={{ backgroundColor: restaurant.primary_color ?? '#f97316' }}
      />
      <div className="px-4 pb-4 -mt-8">
        {restaurant.logo_url ? (
          <div className="relative h-16 w-16 rounded-full border-4 border-white shadow overflow-hidden bg-white">
            <Image src={restaurant.logo_url} alt={restaurant.name} fill className="object-cover" />
          </div>
        ) : (
          <div
            className="h-16 w-16 rounded-full border-4 border-white shadow flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: restaurant.primary_color ?? '#f97316' }}
          >
            {restaurant.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
          <div className="flex items-center gap-2">
            {busy && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 bg-orange-50">
                Movimento intenso
              </Badge>
            )}
            <Badge variant={restaurant.is_open ? 'default' : 'destructive'} className="text-xs">
              {restaurant.is_open ? 'Aberto' : 'Fechado'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {restaurant.operation_mode !== 'delivery'
              ? `Balcão: ~${timeBalcao} min`
              : ''}
            {restaurant.operation_mode === 'ambos' ? ' · ' : ''}
            {restaurant.operation_mode !== 'balcao'
              ? `Entrega: ~${timeDelivery} min`
              : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
