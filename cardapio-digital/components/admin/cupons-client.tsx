'use client'

import { useState } from 'react'
import { Coupon } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Tag, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props {
  initialCoupons: Coupon[]
  restaurantId: string
}

const emptyForm = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  min_order_value: '',
  max_uses: '',
  valid_until: '',
}

export default function CuponsClient({ initialCoupons, restaurantId }: Props) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim() || !form.discount_value) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('coupons')
        .insert({
          restaurant_id: restaurantId,
          code: form.code.trim().toUpperCase(),
          discount_type: form.discount_type,
          discount_value: parseFloat(form.discount_value),
          min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : 0,
          max_uses: form.max_uses ? parseInt(form.max_uses) : null,
          valid_until: form.valid_until || null,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe um cupom com esse código')
        } else {
          toast.error(error.message)
        }
        return
      }

      setCoupons([data as Coupon, ...coupons])
      setForm(emptyForm)
      setShowForm(false)
      toast.success('Cupom criado!')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(coupon: Coupon) {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id)

    if (error) { toast.error(error.message); return }
    setCoupons(coupons.map((c) => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
    toast.success(coupon.is_active ? 'Cupom desativado' : 'Cupom ativado')
  }

  function discountLabel(c: Coupon) {
    return c.discount_type === 'percentage'
      ? `${c.discount_value}% off`
      : `${formatCurrency(c.discount_value)} off`
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-orange-500" />
          <h1 className="text-xl font-bold text-gray-900">Cupons de desconto</h1>
        </div>
        <Button
          onClick={() => setShowForm((s) => !s)}
          className="bg-orange-500 hover:bg-orange-600 gap-1"
          size="sm"
        >
          <Plus className="h-4 w-4" /> Novo cupom
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm p-5 space-y-4 border border-orange-100">
          <h2 className="font-bold text-gray-900">Novo cupom</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Código</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="EX: PROMO10"
                required
                className="mt-1 uppercase"
              />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })}
                className="mt-1 w-full h-10 rounded-md border border-gray-200 px-3 text-sm bg-white"
              >
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">
                Desconto {form.discount_type === 'percentage' ? '(%)' : '(R$)'}
              </Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                placeholder={form.discount_type === 'percentage' ? '10' : '5,00'}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Pedido mínimo (R$) <span className="text-gray-400">opcional</span></Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.min_order_value}
                onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
                placeholder="0,00"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Limite de usos <span className="text-gray-400">opcional</span></Label>
              <Input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="Ilimitado"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Válido até <span className="text-gray-400">opcional</span></Label>
              <Input
                type="datetime-local"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar cupom'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm) }}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {coupons.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum cupom criado ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-2xl shadow-sm p-4 border transition-opacity ${c.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm font-mono tracking-wider">{c.code}</span>
                    <Badge className={`text-[10px] ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge className="text-[10px] bg-orange-100 text-orange-700">{discountLabel(c)}</Badge>
                  </div>
                  <div className="text-xs text-gray-500 space-x-3">
                    {c.min_order_value > 0 && <span>Mín. {formatCurrency(c.min_order_value)}</span>}
                    <span>{c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''} usos</span>
                    {c.valid_until && (
                      <span>Expira {new Date(c.valid_until).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleActive(c)}
                  className="shrink-0 text-xs"
                >
                  {c.is_active ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
