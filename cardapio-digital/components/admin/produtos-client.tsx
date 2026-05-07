'use client'

import { useState, useRef } from 'react'
import { Product } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Upload, X, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

interface Props {
  initialProducts: Product[]
  categories: { id: string; name: string }[]
  restaurantId: string
}

const emptyForm = { name: '', description: '', base_price: '', category_id: '', image_url: '' }

export default function ProdutosClient({ initialProducts, categories, restaurantId }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({ name: p.name, description: p.description ?? '', base_price: String(p.base_price), category_id: p.category_id, image_url: p.image_url ?? '' })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.category_id) { toast.error('Preencha nome e categoria'); return }
    setLoading(true)
    const payload = {
      name: form.name,
      description: form.description || null,
      base_price: parseFloat(form.base_price) || 0,
      category_id: form.category_id,
      image_url: form.image_url || null,
    }

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id)
      if (error) { toast.error('Erro ao salvar'); setLoading(false); return }
      setProducts((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...payload } : p))
      toast.success('Produto atualizado')
    } else {
      const { data, error } = await supabase.from('products').insert({ ...payload, restaurant_id: restaurantId, sort_order: products.length }).select('*, category:categories(name)').single()
      if (error) { toast.error('Erro ao criar'); setLoading(false); return }
      setProducts((prev) => [...prev, data as Product])
      toast.success('Produto criado')
    }
    setLoading(false)
    setOpen(false)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 5 MB.'); return }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error ?? 'Erro ao enviar imagem')
        return
      }

      setForm((f) => ({ ...f, image_url: json.url }))
      toast.success('Imagem enviada!')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      toast.error('Erro de conexão ao enviar imagem')
    } finally {
      setUploading(false)
    }
  }

  async function toggleAvailable(p: Product) {
    const { error } = await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id)
    if (!error) setProducts((prev) => prev.map((item) => item.id === p.id ? { ...item, is_available: !item.is_available } : item))
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Deletar "${p.name}"?`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) { toast.error('Erro ao deletar'); return }
    setProducts((prev) => prev.filter((item) => item.id !== p.id))
    toast.success('Produto removido')
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cardápio</h1>
          <div className="flex gap-3 mt-2">
            <Link href="/admin/cardapio/categorias" className="text-sm text-gray-400 hover:text-gray-600">Categorias</Link>
            <span className="text-sm font-medium text-orange-500 border-b-2 border-orange-500 pb-1">Produtos</span>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="h-4 w-4 mr-1" /> Novo produto
        </Button>
      </div>

      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
            {p.image_url && (
              <div className="relative h-16 w-16 rounded-lg overflow-hidden shrink-0">
                <Image src={p.image_url} alt={p.name} fill sizes="64px" className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{p.name}</span>
                {!p.is_available && <Badge variant="secondary" className="text-xs">Indisponível</Badge>}
              </div>
              <p className="text-xs text-gray-400">{(p as any).category?.name}</p>
              <p className="text-sm font-bold text-orange-500">{formatCurrency(p.base_price)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleAvailable(p)} className={`text-xs underline ${p.is_available ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'}`}>
                {p.is_available ? 'Desativar' : 'Ativar'}
              </button>
              <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-gray-700"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(p)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {products.length === 0 && <p className="text-gray-400 text-sm text-center py-12">Nenhum produto. Crie o primeiro!</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Categoria</Label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="mt-1 text-sm" />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Imagem do produto</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {form.image_url ? (
                <div className="mt-1 relative rounded-xl overflow-hidden bg-gray-100 h-40 w-full">
                  <Image src={form.image_url} alt="preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs rounded-lg px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? 'Enviando...' : 'Trocar'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-1 w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-colors"
                >
                  {uploading ? (
                    <span className="text-sm">Enviando...</span>
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm font-medium">Clique para escolher imagem</span>
                      <span className="text-xs">JPG, PNG, WebP · máx 5 MB</span>
                    </>
                  )}
                </button>
              )}
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
