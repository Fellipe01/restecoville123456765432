'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2 } from 'lucide-react'

const schema = z.object({
  restaurantName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  secret: z.string().min(1, 'Chave de acesso obrigatória'),
})

type FormData = z.infer<typeof schema>

export default function OnboardingPage() {
  const [success, setSuccess] = useState<{ slug: string; name: string } | null>(null)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      setServerError(json.error ?? 'Erro desconhecido')
      return
    }
    setSuccess({ slug: json.restaurant.slug, name: json.restaurant.name })
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tudo pronto!</h1>
          <p className="text-gray-600 mb-6">
            O restaurante <strong>{success.name}</strong> foi criado com sucesso.
          </p>
          <a
            href="/admin/login"
            className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Ir para o painel
          </a>
          <p className="text-xs text-gray-400 mt-4">Slug: {success.slug}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-4xl mb-2">🍽</p>
          <h1 className="text-2xl font-bold text-gray-900">Novo restaurante</h1>
          <p className="text-gray-500 text-sm mt-1">Crie sua conta em segundos</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Nome do restaurante</Label>
            <Input {...register('restaurantName')} placeholder="Ex: Pizzaria do João" className="mt-1" />
            {errors.restaurantName && <p className="text-red-500 text-xs mt-1">{errors.restaurantName.message}</p>}
          </div>
          <div>
            <Label>E-mail do administrador</Label>
            <Input {...register('email')} type="email" placeholder="admin@email.com" className="mt-1" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label>Senha</Label>
            <Input {...register('password')} type="password" placeholder="Mínimo 8 caracteres" className="mt-1" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <Label>Chave de acesso</Label>
            <Input {...register('secret')} type="password" placeholder="Fornecida pela plataforma" className="mt-1" />
            {errors.secret && <p className="text-red-500 text-xs mt-1">{errors.secret.message}</p>}
          </div>

          {serverError && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{serverError}</p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-600">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar restaurante'}
          </Button>
        </form>
      </div>
    </div>
  )
}
