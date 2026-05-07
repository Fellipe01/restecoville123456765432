'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface Deliverer {
  id: string
  name: string
  phone: string | null
  is_active: boolean
  created_at: string
}

interface Props {
  initialDeliverers: Deliverer[]
}

export default function EntregadoresClient({ initialDeliverers }: Props) {
  const [deliverers, setDeliverers] = useState<Deliverer[]>(initialDeliverers)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Deliverer | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  function openCreate() {
    setEditing(null)
    setName('')
    setPhone('')
    setPassword('')
    setOpen(true)
  }

  function openEdit(d: Deliverer) {
    setEditing(d)
    setName(d.name)
    setPhone(d.phone ?? '')
    setPassword('')
    setOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    if (!editing && !password.trim()) { toast.error('Senha obrigatória'); return }
    setLoading(true)

    try {
      const res = await fetch('/api/entregador', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editing ? { id: editing.id } : {}),
          name, phone, password: password || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }

      if (editing) {
        setDeliverers((prev) => prev.map((d) => d.id === editing.id ? { ...d, ...json.deliverer } : d))
        toast.success('Entregador atualizado')
      } else {
        setDeliverers((prev) => [...prev, json.deliverer])
        toast.success('Entregador criado')
      }
      setOpen(false)
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(d: Deliverer) {
    const res = await fetch('/api/entregador', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d.id, is_active: !d.is_active }),
    })
    if (res.ok) {
      setDeliverers((prev) => prev.map((x) => x.id === d.id ? { ...x, is_active: !d.is_active } : x))
    }
  }

  async function handleDelete(d: Deliverer) {
    if (!confirm(`Remover entregador "${d.name}"?`)) return
    const res = await fetch('/api/entregador', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d.id }),
    })
    if (res.ok) {
      setDeliverers((prev) => prev.filter((x) => x.id !== d.id))
      toast.success('Entregador removido')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entregadores</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os entregadores e suas credenciais</p>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="h-4 w-4 mr-1" /> Novo entregador
        </Button>
      </div>

      {/* Link para tela do entregador */}
      <div className="mb-6 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">Tela do entregador</p>
          <p className="text-xs text-gray-500">/entregador/login</p>
        </div>
        <a
          href="/entregador/login"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-orange-600 hover:underline font-medium"
        >
          Abrir →
        </a>
      </div>

      <div className="space-y-3">
        {deliverers.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-12">Nenhum entregador cadastrado.</p>
        )}
        {deliverers.map((d) => (
          <div key={d.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                {d.name[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{d.name}</p>
                {d.phone && <p className="text-xs text-gray-400">{d.phone}</p>}
              </div>
              <Badge variant={d.is_active ? 'default' : 'secondary'} className="text-xs">
                {d.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(d)} className="text-gray-400 hover:text-gray-700">
                {d.is_active
                  ? <ToggleRight className="h-5 w-5 text-green-500" />
                  : <ToggleLeft className="h-5 w-5" />}
              </button>
              <button onClick={() => openEdit(d)} className="text-gray-400 hover:text-gray-700">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(d)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar entregador' : 'Novo entregador'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome <span className="text-red-400">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do entregador" className="mt-1" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="(11) 99999-9999" className="mt-1" />
            </div>
            <div>
              <Label>
                Senha {editing ? <span className="text-gray-400 font-normal">(deixe em branco para não alterar)</span> : <span className="text-red-400">*</span>}
              </Label>
              <div className="relative mt-1">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editing ? 'Nova senha...' : 'Senha de acesso'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
              {editing ? 'Salvar alterações' : 'Criar entregador'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
