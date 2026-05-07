'use client'

import { useState } from 'react'
import { Restaurant } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
  restaurant: Restaurant | null
}

export default function RestauranteConfigClient({ restaurant }: Props) {
  const [form, setForm] = useState({
    name: restaurant?.name ?? '',
    city: restaurant?.city ?? '',
    primary_color: restaurant?.primary_color ?? '#f97316',
    operation_mode: restaurant?.operation_mode ?? 'ambos',
    estimated_time_balcao: restaurant?.estimated_time_balcao ?? 20,
    estimated_time_delivery: restaurant?.estimated_time_delivery ?? 45,
    is_open: restaurant?.is_open ?? true,
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const tabs = [
    { href: '/admin/configuracoes/restaurante', label: 'Restaurante' },
    { href: '/admin/configuracoes/horarios', label: 'Horários' },
    { href: '/admin/configuracoes/entrega', label: 'Entrega' },
    { href: '/admin/configuracoes/whatsapp', label: 'WhatsApp' },
  ]

  async function handleSave() {
    if (!restaurant) return
    setLoading(true)
    const { error } = await supabase.from('restaurants').update(form).eq('id', restaurant.id)
    if (error) toast.error('Erro ao salvar')
    else toast.success('Configurações salvas')
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurações</h1>
      <div className="flex gap-4 mb-6 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab.href.endsWith('restaurante')
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="space-y-5 bg-white rounded-xl p-5 shadow-sm">
        <div>
          <Label>Nome do restaurante</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
        </div>
        <div>
          <Label>Cidade / Estado</Label>
          <Input
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="Ex: Gurupi - TO"
            className="mt-1"
          />
          <p className="text-xs text-gray-400 mt-1">Usado para localização no Maps pelos entregadores</p>
        </div>
        <div>
          <Label>Cor principal</Label>
          <div className="flex items-center gap-3 mt-1">
            <input type="color" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="h-10 w-16 rounded border cursor-pointer" />
            <Input value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="w-32" />
          </div>
        </div>
        <Separator />
        <div>
          <Label>Modo de operação</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[{ v: 'balcao', l: '🏪 Balcão' }, { v: 'delivery', l: '🛵 Delivery' }, { v: 'ambos', l: '🏪🛵 Ambos' }].map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => setForm((f) => ({ ...f, operation_mode: v as any }))}
                className={`py-2 rounded-lg border text-sm transition-colors ${form.operation_mode === v ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-gray-200 text-gray-600'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tempo balcão (min)</Label>
            <Input type="number" value={form.estimated_time_balcao} onChange={(e) => setForm((f) => ({ ...f, estimated_time_balcao: +e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>Tempo delivery (min)</Label>
            <Input type="number" value={form.estimated_time_delivery} onChange={(e) => setForm((f) => ({ ...f, estimated_time_delivery: +e.target.value }))} className="mt-1" />
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">Status do restaurante</p>
            <p className="text-sm text-gray-500">Ativar/desativar recebimento de pedidos</p>
          </div>
          <button
            onClick={() => setForm((f) => ({ ...f, is_open: !f.is_open }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_open ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_open ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar configurações'}
        </Button>
      </div>
    </div>
  )
}
