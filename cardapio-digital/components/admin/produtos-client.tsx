'use client'

import { useState, useRef } from 'react'
import { Product, VariationGroup, Variation } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Upload, X, ImageIcon, Layers } from 'lucide-react'
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
  const variationFileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Variações
  const [variacoesProduct, setVariacoesProduct] = useState<Product | null>(null)
  const [groups, setGroups] = useState<VariationGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [uploadingVarId, setUploadingVarId] = useState<{ groupId: string; variationId: string } | null>(null)
  const [productPickerGroupId, setProductPickerGroupId] = useState<string | null>(null)

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

  async function openVariacoes(product: Product) {
    setVariacoesProduct(product)
    setLoadingGroups(true)
    const { data } = await supabase
      .from('variation_groups')
      .select('*, variations(*)')
      .eq('product_id', product.id)
      .order('sort_order')
    if (data) setGroups(data as VariationGroup[])
    setLoadingGroups(false)
  }

  async function addGroup() {
    if (!variacoesProduct) return
    const { data, error } = await supabase
      .from('variation_groups')
      .insert({ product_id: variacoesProduct.id, name: 'Novo grupo', required: false, min_selections: 0, max_selections: 1, sort_order: groups.length })
      .select('*, variations(*)')
      .single()
    if (error) { toast.error('Erro ao adicionar grupo: ' + error.message); return }
    if (data) setGroups((prev) => [...prev, data as VariationGroup])
  }

  async function updateGroup(groupId: string, updates: Partial<VariationGroup>) {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, ...updates } : g))
    await supabase.from('variation_groups').update(updates).eq('id', groupId)
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('Apagar este grupo e todas as opções?')) return
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
    await supabase.from('variation_groups').delete().eq('id', groupId)
  }

  async function addVariation(groupId: string) {
    const group = groups.find((g) => g.id === groupId)
    const { data, error } = await supabase
      .from('variations')
      .insert({ group_id: groupId, name: 'Nova opção', price_modifier: 0, is_available: true, sort_order: group?.variations?.length ?? 0 })
      .select()
      .single()
    if (error) { toast.error('Erro ao adicionar opção: ' + error.message); return }
    if (data) {
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, variations: [...(g.variations ?? []), data as Variation] } : g))
    }
  }

  async function importFromProduct(groupId: string, product: Product) {
    const group = groups.find((g) => g.id === groupId)
    const basePrice = variacoesProduct?.base_price ?? 0
    const modifier = product.base_price - basePrice
    const { data, error } = await supabase
      .from('variations')
      .insert({
        group_id: groupId,
        name: product.name,
        price_modifier: modifier,
        image_url: product.image_url ?? null,
        is_available: true,
        sort_order: group?.variations?.length ?? 0,
      })
      .select()
      .single()
    if (error) { toast.error('Erro ao importar: ' + error.message); return }
    if (data) {
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, variations: [...(g.variations ?? []), data as Variation] } : g))
      toast.success(`"${product.name}" importado!`)
    }
    setProductPickerGroupId(null)
  }

  async function updateVariation(groupId: string, variationId: string, updates: Partial<Variation>) {
    const snapshot = groups
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, variations: g.variations?.map((v) => v.id === variationId ? { ...v, ...updates } : v) } : g))
    const { error } = await supabase.from('variations').update(updates).eq('id', variationId)
    if (error) {
      setGroups(snapshot)
      toast.error('Erro ao salvar. Tente novamente.')
    }
  }

  async function deleteVariation(groupId: string, variationId: string) {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, variations: g.variations?.filter((v) => v.id !== variationId) } : g))
    await supabase.from('variations').delete().eq('id', variationId)
  }

  function triggerVariationImage(groupId: string, variationId: string) {
    setUploadingVarId({ groupId, variationId })
    variationFileRef.current?.click()
  }

  async function handleVariationImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadingVarId) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 5 MB.'); return }
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Erro ao enviar imagem'); return }
    await updateVariation(uploadingVarId.groupId, uploadingVarId.variationId, { image_url: json.url })
    toast.success('Imagem adicionada!')
    if (variationFileRef.current) variationFileRef.current.value = ''
    setUploadingVarId(null)
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
              <button onClick={() => openVariacoes(p)} title="Gerenciar variações" className="text-gray-400 hover:text-orange-500"><Layers className="h-4 w-4" /></button>
              <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-gray-700"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(p)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {products.length === 0 && <p className="text-gray-400 text-sm text-center py-12">Nenhum produto. Crie o primeiro!</p>}
      </div>

      {/* Dialog de Variações */}
      <Dialog open={!!variacoesProduct} onOpenChange={(o) => { if (!o) setVariacoesProduct(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Variações — {variacoesProduct?.name}</DialogTitle>
          </DialogHeader>

          {loadingGroups ? (
            <div className="py-8 text-center text-gray-400 text-sm">Carregando...</div>
          ) : (
            <div className="space-y-4 pt-2">
              {groups.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">Nenhum grupo ainda. Adicione um abaixo.</p>
              )}

              {groups.map((group) => (
                <div key={group.id} className="border border-gray-200 rounded-xl p-3 space-y-3">
                  {/* Cabeçalho do grupo */}
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 font-semibold text-sm border-0 border-b border-gray-200 focus:border-orange-400 outline-none py-1 bg-transparent"
                      defaultValue={group.name}
                      onBlur={(e) => updateGroup(group.id, { name: e.target.value })}
                    />
                    <button onClick={() => deleteGroup(group.id)} className="text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Configurações do grupo */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(e) => updateGroup(group.id, { required: e.target.checked })}
                      />
                      Obrigatório
                    </label>
                    <label className="flex items-center gap-1.5">
                      Máx. opções:
                      <select
                        className="border border-gray-200 rounded px-1 py-0.5 text-xs"
                        value={group.max_selections}
                        onChange={(e) => updateGroup(group.id, { max_selections: parseInt(e.target.value) })}
                      >
                        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Opções do grupo */}
                  <div className="space-y-3">
                    {group.variations?.map((variation) => {
                      const isSingle = group.max_selections === 1
                      const basePrice = variacoesProduct?.base_price ?? 0
                      const displayPrice = isSingle
                        ? basePrice + variation.price_modifier
                        : variation.price_modifier
                      return (
                      <div key={variation.id} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          {/* Foto da variação */}
                          <button
                            type="button"
                            onClick={() => triggerVariationImage(group.id, variation.id)}
                            title="Adicionar foto"
                            className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-gray-200 hover:border-orange-400 flex items-center justify-center bg-gray-50 transition-colors"
                          >
                            {variation.image_url ? (
                              <Image src={variation.image_url} alt={variation.name} fill sizes="40px" className="object-cover" />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-gray-300" />
                            )}
                            {uploadingVarId?.variationId === variation.id && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-white text-xs">...</span>
                              </div>
                            )}
                          </button>
                          <input
                            className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:border-orange-400 outline-none"
                            defaultValue={variation.name}
                            placeholder="Nome da opção"
                            onBlur={(e) => updateVariation(group.id, variation.id, { name: e.target.value })}
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-gray-400">{isSingle ? 'R$' : '+R$'}</span>
                            <input
                              className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:border-orange-400 outline-none"
                              type="number"
                              step="0.01"
                              min="0"
                              key={`${variation.id}-price`}
                              defaultValue={displayPrice}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                const modifier = isSingle ? val - basePrice : val
                                updateVariation(group.id, variation.id, { price_modifier: modifier })
                              }}
                            />
                          </div>
                          <button onClick={() => deleteVariation(group.id, variation.id)} className="text-red-400 hover:text-red-600 shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <input
                          className="w-full text-xs border border-gray-100 rounded-lg px-2 py-1.5 focus:border-orange-400 outline-none text-gray-500 placeholder:text-gray-300 ml-12"
                          defaultValue={variation.description ?? ''}
                          placeholder="Ingredientes ou descrição (opcional)"
                          onBlur={(e) => updateVariation(group.id, variation.id, { description: e.target.value || null })}
                        />
                      </div>
                    )})}

                    <div className="flex items-center gap-3 mt-1">
                      <button
                        onClick={() => addVariation(group.id)}
                        className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Adicionar opção
                      </button>
                      <button
                        onClick={() => setProductPickerGroupId(group.id)}
                        className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        <Layers className="h-3 w-3" /> Importar produto
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full border-dashed" onClick={addGroup}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar grupo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: picker de produto para importar como variação */}
      <Dialog open={!!productPickerGroupId} onOpenChange={(o) => { if (!o) setProductPickerGroupId(null) }}>
        <DialogContent className="max-w-sm max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar produto como opção</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-2 mb-3">Selecione um produto para preencher nome, preço e imagem automaticamente.</p>
          <div className="space-y-2">
            {products
              .filter((p) => p.id !== variacoesProduct?.id && p.is_available)
              .map((p) => {
                const modifier = p.base_price - (variacoesProduct?.base_price ?? 0)
                return (
                  <button
                    key={p.id}
                    onClick={() => importFromProduct(productPickerGroupId!, p)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
                  >
                    {p.image_url ? (
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        <Image src={p.image_url} alt={p.name} fill sizes="40px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-xs">
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-gray-800 block truncate">{p.name}</span>
                      <span className="text-xs text-gray-400">{formatCurrency(p.base_price)}</span>
                    </span>
                    <span className={`text-xs font-bold shrink-0 ${modifier === 0 ? 'text-gray-400' : modifier > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>
                      {modifier === 0 ? 'mesmo preço' : modifier > 0 ? `+${formatCurrency(modifier)}` : formatCurrency(modifier)}
                    </span>
                  </button>
                )
              })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Input global para upload de imagem de variação */}
      <input ref={variationFileRef} type="file" accept="image/*" className="hidden" onChange={handleVariationImageUpload} />

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
