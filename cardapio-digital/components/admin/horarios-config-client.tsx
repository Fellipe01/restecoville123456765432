'use client'

import { useState } from 'react'
import { BusinessHours } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

interface Props {
  initialHours: BusinessHours[]
  restaurantId: string
}

export default function HorariosConfigClient({ initialHours, restaurantId }: Props) {
  const [hours, setHours] = useState<BusinessHours[]>(initialHours)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const tabs = [
    { href: '/admin/configuracoes/restaurante', label: 'Restaurante' },
    { href: '/admin/configuracoes/horarios', label: 'Horários' },
    { href: '/admin/configuracoes/entrega', label: 'Entrega' },
    { href: '/admin/configuracoes/whatsapp', label: 'WhatsApp' },
  ]

  function update(dayIndex: number, field: keyof BusinessHours, value: string | boolean) {
    setHours((prev) => prev.map((h) => h.day_of_week === dayIndex ? { ...h, [field]: value } : h))
  }

  async function handleSave() {
    setLoading(true)
    const { error } = await supabase.from('business_hours').upsert(
      hours.map((h) => ({ ...h, restaurant_id: restaurantId })),
      { onConflict: 'restaurant_id,day_of_week' }
    )
    if (error) toast.error('Erro ao salvar')
    else toast.success('Horários salvos')
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurações</h1>
      <div className="flex gap-4 mb-6 border-b">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab.href.endsWith('horarios') ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {DAYS.map((day, idx) => {
          const h = hours.find((hh) => hh.day_of_week === idx)
          if (!h) return null
          return (
            <div key={idx} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
              <span className="w-20 text-sm font-medium text-gray-700">{day}</span>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={h.open_time}
                  disabled={h.is_closed}
                  onChange={(e) => update(idx, 'open_time', e.target.value)}
                  className="w-28 text-sm"
                />
                <span className="text-gray-400 text-sm">até</span>
                <Input
                  type="time"
                  value={h.close_time}
                  disabled={h.is_closed}
                  onChange={(e) => update(idx, 'close_time', e.target.value)}
                  className="w-28 text-sm"
                />
              </div>
              <label className="flex items-center gap-1.5 text-sm text-gray-500 shrink-0">
                <input type="checkbox" checked={h.is_closed} onChange={(e) => update(idx, 'is_closed', e.target.checked)} className="rounded" />
                Fechado
              </label>
            </div>
          )
        })}
      </div>

      <Button onClick={handleSave} disabled={loading} className="mt-4 w-full bg-orange-500 hover:bg-orange-600">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar horários'}
      </Button>
    </div>
  )
}
