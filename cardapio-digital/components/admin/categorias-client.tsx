'use client'

import { useState } from 'react'
import { Category } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Props {
  initialCategories: Category[]
  restaurantId: string
}

export default function CategoriasClient({ initialCategories, restaurantId }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function openCreate() {
    setEditing(null)
    setName('')
    setOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setName(cat.name)
    setOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    if (editing) {
      const { error } = await supabase.from('categories').update({ name }).eq('id', editing.id)
      if (error) { toast.error('Erro ao salvar'); setLoading(false); return }
      setCategories((prev) => prev.map((c) => c.id === editing.id ? { ...c, name } : c))
      toast.success('Categoria atualizada')
    } else {
      const { data, error } = await supabase.from('categories').insert({ name, restaurant_id: restaurantId, sort_order: categories.length }).select().single()
      if (error) { toast.error('Erro ao criar'); setLoading(false); return }
      setCategories((prev) => [...prev, data as Category])
      toast.success('Categoria criada')
    }
    setLoading(false)
    setOpen(false)
  }

  async function toggleActive(cat: Category) {
    const { error } = await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    if (!error) setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: !c.is_active } : c))
  }

  async function toggleShowInCart(cat: Category) {
    const { error } = await supabase.from('categories').update({ show_in_cart: !cat.show_in_cart }).eq('id', cat.id)
    if (!error) setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, show_in_cart: !c.show_in_cart } : c))
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Deletar categoria "${cat.name}"? Todos os produtos serão removidos.`)) return
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (error) { toast.error('Erro ao deletar'); return }
    setCategories((prev) => prev.filter((c) => c.id !== cat.id))
    toast.success('Categoria removida')
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cardápio</h1>
          <div className="flex gap-3 mt-2">
            <span className="text-sm font-medium text-orange-500 border-b-2 border-orange-500 pb-1">Categorias</span>
            <Link href="/admin/cardapio/produtos" className="text-sm text-gray-400 hover:text-gray-600">Produtos</Link>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="h-4 w-4 mr-1" /> Nova categoria
        </Button>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-900">{cat.name}</span>
              <Badge variant={cat.is_active ? 'default' : 'secondary'} className="text-xs">
                {cat.is_active ? 'Ativa' : 'Inativa'}
              </Badge>
              {cat.show_in_cart && (
                <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                  🛒 Sugestões
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleShowInCart(cat)}
                className={`text-xs underline ${cat.show_in_cart ? 'text-orange-500 hover:text-orange-700' : 'text-gray-400 hover:text-gray-600'}`}
                title="Produtos desta categoria aparecem como sugestões no carrinho"
              >
                {cat.show_in_cart ? 'No carrinho ✓' : 'Mostrar no carrinho'}
              </button>
              <button onClick={() => toggleActive(cat)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                {cat.is_active ? 'Desativar' : 'Ativar'}
              </button>
              <button onClick={() => openEdit(cat)} className="text-gray-400 hover:text-gray-700">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(cat)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 && <p className="text-gray-400 text-sm text-center py-12">Nenhuma categoria. Crie a primeira!</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Lanches, Bebidas..." className="mt-1" />
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
