'use client'

import { useState } from 'react'
import { DeliveryZone } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Props {
  initialZones: DeliveryZone[]
  restaurantId: string
}

const emptyForm = { name: '', fee: '', estimated_minutes: '45' }

export default function EntregaConfigClient({ initialZones, restaurantId }: Props) {
  const [zones, setZones] = useState<DeliveryZone[]>(initialZones)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DeliveryZone | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const tabs = [
    { href: '/admin/configuracoes/restaurante', label: 'Restaurante' },
    { href: '/admin/configuracoes/horarios', label: 'Horários' },
    { href: '/admin/configuracoes/entrega', label: 'Entrega' },
    { href: '/admin/configuracoes/whatsapp', label: 'WhatsApp' },
  ]

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(z: DeliveryZone) {
    setEditing(z)
    setForm({ name: z.name, fee: String(z.fee), estimated_minutes: String(z.estimated_minutes) })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setLoading(true)
    const payload = { name: form.name, fee: parseFloat(form.fee) || 0, estimated_minutes: parseInt(form.estimated_minutes) || 45 }

    if (editing) {
      const { error } = await supabase.from('delivery_zones').update(payload).eq('id', editing.id)
      if (error) { toast.error('Erro'); setLoading(false); return }
      setZones((prev) => prev.map((z) => z.id === editing.id ? { ...z, ...payload } : z))
      toast.success('Bairro atualizado')
    } else {
      const { data, error } = await supabase.from('delivery_zones').insert({ ...payload, restaurant_id: restaurantId }).select().single()
      if (error) { toast.error('Erro'); setLoading(false); return }
      setZones((prev) => [...prev, data as DeliveryZone])
      toast.success('Bairro adicionado')
    }
    setLoading(false)
    setOpen(false)
  }

  async function handleDelete(z: DeliveryZone) {
    if (!confirm(`Remover bairro "${z.name}"?`)) return
    await supabase.from('delivery_zones').delete().eq('id', z.id)
    setZones((prev) => prev.filter((item) => item.id !== z.id))
    toast.success('Bairro removido')
  }

  async function toggleActive(z: DeliveryZone) {
    await supabase.from('delivery_zones').update({ is_active: !z.is_active }).eq('id', z.id)
    setZones((prev) => prev.map((item) => item.id === z.id ? { ...item, is_active: !item.is_active } : item))
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurações</h1>
      <div className="flex gap-4 mb-6 border-b">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab.href.endsWith('entrega') ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Bairros e taxas de entrega</h2>
        <Button onClick={openCreate} size="sm" className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-1" /> Adicionar bairro
        </Button>
      </div>

      <div className="space-y-3 bg-white rounded-xl shadow-sm overflow-hidden">
        {zones.map((z) => (
          <div key={z.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
            <div>
              <p className="font-medium text-gray-900">{z.name}</p>
              <p className="text-sm text-gray-500">{formatCurrency(z.fee)} · ~{z.estimated_minutes} min</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(z)} className={`text-xs underline ${z.is_active ? 'text-red-400' : 'text-green-500'}`}>
                {z.is_active ? 'Desativar' : 'Ativar'}
              </button>
              <button onClick={() => openEdit(z)} className="text-gray-400 hover:text-gray-700"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(z)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {zones.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Nenhum bairro cadastrado</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar bairro' : 'Novo bairro'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>Nome do bairro</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Taxa de entrega (R$)</Label><Input type="number" step="0.50" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))} className="mt-1" /></div>
            <div><Label>Tempo estimado (min)</Label><Input type="number" value={form.estimated_minutes} onChange={(e) => setForm((f) => ({ ...f, estimated_minutes: e.target.value }))} className="mt-1" /></div>
            <Button onClick={handleSave} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
