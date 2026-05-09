'use client'

import { useState } from 'react'
import { Restaurant } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Link from 'next/link'

type DeliveryConfig = Pick<Restaurant, 'id' | 'delivery_base_radius_km' | 'delivery_base_fee' | 'delivery_extra_fee_per_km' | 'delivery_max_radius_km'>

interface Props {
  restaurant: DeliveryConfig | null
}

const tabs = [
  { href: '/admin/configuracoes/restaurante', label: 'Restaurante' },
  { href: '/admin/configuracoes/horarios', label: 'Horários' },
  { href: '/admin/configuracoes/entrega', label: 'Entrega' },
  { href: '/admin/configuracoes/whatsapp', label: 'WhatsApp' },
]

export default function EntregaConfigClient({ restaurant }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    delivery_base_radius_km: String(restaurant?.delivery_base_radius_km ?? 3),
    delivery_base_fee: String(restaurant?.delivery_base_fee ?? 5),
    delivery_extra_fee_per_km: String(restaurant?.delivery_extra_fee_per_km ?? 2),
    delivery_max_radius_km: String(restaurant?.delivery_max_radius_km ?? 15),
  })

  function f(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSave() {
    if (!restaurant?.id) return
    setLoading(true)
    const { error } = await supabase
      .from('restaurants')
      .update({
        delivery_base_radius_km: parseFloat(form.delivery_base_radius_km) || 3,
        delivery_base_fee: parseFloat(form.delivery_base_fee) || 0,
        delivery_extra_fee_per_km: parseFloat(form.delivery_extra_fee_per_km) || 0,
        delivery_max_radius_km: parseFloat(form.delivery_max_radius_km) || 15,
      })
      .eq('id', restaurant.id)
    setLoading(false)
    if (error) { toast.error('Erro ao salvar'); return }
    toast.success('Configurações salvas')
  }

  const base = parseFloat(form.delivery_base_radius_km) || 0
  const baseFee = parseFloat(form.delivery_base_fee) || 0
  const extra = parseFloat(form.delivery_extra_fee_per_km) || 0
  const max = parseFloat(form.delivery_max_radius_km) || 0

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurações</h1>
      <div className="flex gap-4 mb-6 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab.href.endsWith('entrega')
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <h2 className="font-semibold text-gray-800 mb-4">Taxa de entrega por raio</h2>

      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Raio base (km)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={form.delivery_base_radius_km}
              onChange={f('delivery_base_radius_km')}
              className="mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">Taxa fixa até este raio</p>
          </div>
          <div>
            <Label>Taxa base (R$)</Label>
            <Input
              type="number"
              step="0.50"
              min="0"
              value={form.delivery_base_fee}
              onChange={f('delivery_base_fee')}
              className="mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">Cobrado até o raio base</p>
          </div>
          <div>
            <Label>Adicional por km (R$)</Label>
            <Input
              type="number"
              step="0.50"
              min="0"
              value={form.delivery_extra_fee_per_km}
              onChange={f('delivery_extra_fee_per_km')}
              className="mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">Para cada km além do raio base</p>
          </div>
          <div>
            <Label>Raio máximo (km)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={form.delivery_max_radius_km}
              onChange={f('delivery_max_radius_km')}
              className="mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">Pedidos além deste raio são recusados</p>
          </div>
        </div>

        {base > 0 && max > 0 && (
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-sm text-gray-700 space-y-1">
            <p className="font-semibold text-orange-700 text-xs uppercase tracking-wide mb-2">Simulação</p>
            <p>Até {base} km: <strong>R$ {baseFee.toFixed(2)}</strong></p>
            {extra > 0 && <p>A cada km além de {base} km: <strong>+R$ {extra.toFixed(2)}</strong></p>}
            {extra > 0 && base < max && (
              <p>A {max} km (máximo): <strong>R$ {(baseFee + (max - base) * extra).toFixed(2)}</strong></p>
            )}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600"
        >
          Salvar configurações
        </Button>
      </div>
    </div>
  )
}
