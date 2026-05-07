'use client'

import { useState } from 'react'
import { useDelivererStore } from '@/lib/store/deliverer'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bike, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginClient() {
  const router = useRouter()
  const { setSession } = useDelivererStore()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !password.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/entregador/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      setSession(json.session, json.token)
      router.push('/entregador')
    } catch {
      toast.error('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 mb-4">
            <Bike className="h-8 w-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Área do Entregador</h1>
          <p className="text-gray-400 text-sm mt-1">Entre com suas credenciais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="mt-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-gray-300">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !name.trim() || !password.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-base mt-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
