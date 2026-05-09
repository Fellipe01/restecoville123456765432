'use client'

import { Restaurant } from '@/types'
import { Clock, MapPin } from 'lucide-react'
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
    <div className="relative">
      {/* Hero com imagem/cor + gradiente escuro */}
      <div className="relative h-44 w-full overflow-hidden">
        {restaurant.logo_url ? (
          <Image
            src={restaurant.logo_url}
            alt={restaurant.name}
            fill
            priority
            className="object-cover blur-sm scale-110 opacity-70"
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${restaurant.primary_color ?? '#f97316'} 0%, #1f2937 120%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Pílula de status no topo */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {busy && (
            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-amber-100/95 text-amber-700 backdrop-blur-sm shadow-sm">
              Movimento intenso
            </span>
          )}
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full backdrop-blur-sm shadow-sm ${
              restaurant.is_open
                ? 'bg-emerald-500/95 text-white'
                : 'bg-red-500/95 text-white'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${restaurant.is_open ? 'bg-white animate-pulse' : 'bg-white'}`} />
            {restaurant.is_open ? 'Aberto' : 'Fechado'}
          </span>
        </div>

        {/* Nome do restaurante sobre o gradiente */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end gap-3">
          {restaurant.logo_url ? (
            <div className="relative h-16 w-16 rounded-2xl border-2 border-white shadow-lg overflow-hidden bg-white shrink-0">
              <Image src={restaurant.logo_url} alt={restaurant.name} fill className="object-cover" />
            </div>
          ) : (
            <div
              className="h-16 w-16 rounded-2xl border-2 border-white shadow-lg flex items-center justify-center text-white text-2xl font-bold shrink-0"
              style={{ backgroundColor: restaurant.primary_color ?? '#f97316' }}
            >
              {restaurant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-xl font-bold text-white drop-shadow-md leading-tight truncate">
              {restaurant.name}
            </h1>
            {restaurant.city && (
              <p className="text-xs text-white/85 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {restaurant.city}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Linha de info abaixo do hero */}
      <div className="bg-white px-4 py-3 flex items-center gap-4 text-xs border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-gray-700">
          <Clock className="h-3.5 w-3.5 text-orange-500 shrink-0" />
          <span className="font-medium">
            {restaurant.operation_mode !== 'delivery' && (
              <>Balcão ~{timeBalcao}min</>
            )}
            {restaurant.operation_mode === 'ambos' && <span className="mx-1.5 text-gray-300">·</span>}
            {restaurant.operation_mode !== 'balcao' && (
              <>Entrega ~{timeDelivery}min</>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
