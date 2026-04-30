'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
  restaurantId: string
  whatsapp: string
}

export default function WhatsAppConfigClient({ restaurantId, whatsapp: initialWhatsapp }: Props) {
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const tabs = [
    { href: '/admin/configuracoes/restaurante', label: 'Restaurante' },
    { href: '/admin/configuracoes/horarios', label: 'Horários' },
    { href: '/admin/configuracoes/entrega', label: 'Entrega' },
    { href: '/admin/configuracoes/whatsapp', label: 'WhatsApp' },
  ]

  async function handleSave() {
    setLoading(true)
    const { error } = await supabase.from('restaurants').update({ whatsapp_number: whatsapp }).eq('id', restaurantId)
    if (error) toast.error('Erro ao salvar')
    else toast.success('Número salvo')
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurações</h1>
      <div className="flex gap-4 mb-6 border-b">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab.href.endsWith('whatsapp') ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <Label>Número do WhatsApp do restaurante</Label>
          <Input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="11999999999 (só números, com DDD)"
            className="mt-1"
          />
          <p className="text-xs text-gray-400 mt-1">Sem traços, espaços ou parênteses. Ex: 11999999999</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          <p className="font-medium mb-1">Como funciona?</p>
          <p>Após o cliente confirmar o pedido, ele pode clicar em <strong>"Receber confirmação no WhatsApp"</strong> para abrir uma conversa com o resumo do pedido já preenchido.</p>
        </div>

        {whatsapp && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="text-gray-500 mb-1">Pré-visualização do link:</p>
            <p className="font-mono text-xs text-gray-700 break-all">
              https://wa.me/55{whatsapp.replace(/\D/g, '')}?text=...
            </p>
          </div>
        )}

        <Button onClick={handleSave} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar número'}
        </Button>
      </div>
    </div>
  )
}
