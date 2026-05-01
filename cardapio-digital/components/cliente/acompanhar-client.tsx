'use client'

import { useState, useEffect } from 'react'
import { useCustomerStore } from '@/lib/store/customer'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'
import { formatCurrency, getOrderStatusLabel, getOrderStatusColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MessageCircle, RefreshCw, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  restaurantId: string
  whatsappNumber: string | null
}

const STATUS_MESSAGE: Record<string, { icon: string; text: string; bg: string; text_color: string }> = {
  recebido:   { icon: '📋', text: 'Recebemos seu pedido e já vamos começar!',         bg: 'bg-blue-50',   text_color: 'text-blue-700'   },
  preparando: { icon: '👨‍🍳', text: 'Estamos preparando seu pedido com carinho.',        bg: 'bg-amber-50',  text_color: 'text-amber-700'  },
  pronto:     { icon: '✅', text: 'Pedido pronto! Aguardando o entregador.',           bg: 'bg-green-50',  text_color: 'text-green-700'  },
  saindo:     { icon: '🛵', text: 'O entregador acabou de sair com seu pedido!',       bg: 'bg-purple-50', text_color: 'text-purple-700' },
  entregue:   { icon: '🎉', text: 'Pedido entregue. Bom apetite!',                    bg: 'bg-gray-50',   text_color: 'text-gray-600'   },
}

function buildWhatsAppLink(whatsappNumber: string, orderNumber: number) {
  const digits = whatsappNumber.replace(/\D/g, '')
  const number = digits.startsWith('55') ? digits : `55${digits}`
  const msg = encodeURIComponent(`Olá! Preciso de ajuda com meu pedido #${orderNumber}`)
  return `https://wa.me/${number}?text=${msg}`
}

export default function AcompanharClient({ restaurantId, whatsappNumber }: Props) {
  const router = useRouter()
  const { phone, setPhone, clearPhone } = useCustomerStore()
  const [inputPhone, setInputPhone] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!phone) return
    fetchOrders(phone)
    const interval = setInterval(() => fetchOrders(phone), 30_000)
    return () => clearInterval(interval)
  }, [phone])

  async function fetchOrders(p: string) {
    setLoading(true)
    const digits = p.replace(/\D/g, '')
    // Tenta match exato e também somente dígitos (formatos diferentes)
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .or(`customer_phone.eq.${p},customer_phone.eq.${digits}`)
      .in('status', ['recebido', 'preparando', 'pronto', 'saindo'])
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoading(false)
  }

  async function upsertSession(p: string) {
    if (!restaurantId) return
    try {
      await supabase.from('customer_sessions').upsert(
        { phone: p, restaurant_id: restaurantId, last_seen_at: new Date().toISOString() },
        { onConflict: 'phone,restaurant_id' }
      )
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const p = inputPhone.trim()
    if (!p) return
    setPhone(p)
    await upsertSession(p)
    fetchOrders(p)
  }

  function handleClear() {
    clearPhone()
    setOrders([])
    setInputPhone('')
  }

  // ─── Tela de entrada ───────────────────────────────────────────────────────
  if (!phone) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 mb-8" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4">
            <Package className="h-8 w-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Acompanhar pedido</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Digite o WhatsApp usado no pedido
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Número de WhatsApp</Label>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="(11) 99999-9999"
              value={inputPhone}
              onChange={(e) => setInputPhone(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !inputPhone.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 font-bold py-6"
          >
            {loading ? 'Buscando...' : 'Buscar meus pedidos'}
          </Button>
        </form>
      </div>
    )
  }

  // ─── Tela de pedidos ───────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900">
              {orders[0]?.customer_name ? `Olá, ${orders[0].customer_name.split(' ')[0]}!` : 'Meus pedidos'}
            </h1>
            <p className="text-xs text-gray-400">{phone} · atualiza a cada 30s</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOrders(phone)}
            disabled={loading}
            aria-label="Atualizar"
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 underline hover:text-gray-600"
          >
            Sou outra pessoa
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Buscando pedidos...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-semibold text-gray-700">Nenhum pedido em andamento</p>
          <p className="text-sm text-gray-400 mt-1">
            Os pedidos aparecem aqui enquanto estão sendo preparados
          </p>
          <Link href="/" className="mt-6 inline-block text-orange-500 text-sm hover:underline font-medium">
            Ver cardápio
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              {/* Cabeçalho do card */}
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900">Pedido #{order.order_number}</p>
                <Badge className={getOrderStatusColor(order.status)}>
                  {getOrderStatusLabel(order.status)}
                </Badge>
              </div>

              {/* Mensagem de status */}
              {STATUS_MESSAGE[order.status] && (() => {
                const msg = STATUS_MESSAGE[order.status]
                return (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${msg.bg}`}>
                    <span className="text-lg">{msg.icon}</span>
                    <p className={`text-sm font-medium ${msg.text_color}`}>{msg.text}</p>
                  </div>
                )
              })()}

              {/* Tipo */}
              <p className="text-xs text-gray-400">
                {order.type === 'delivery' ? '🛵 Delivery' : '🏪 Retirada no balcão'}
              </p>

              {/* Itens */}
              <div className="text-sm text-gray-600 space-y-0.5 border-t pt-3">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.quantity}× {item.product_name}</span>
                    <span className="text-gray-400">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm text-gray-500">Total</span>
                <span className="font-bold text-orange-500">{formatCurrency(order.total)}</span>
              </div>

              {/* Botão WhatsApp */}
              {whatsappNumber && (
                <a
                  href={buildWhatsAppLink(whatsappNumber, order.order_number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Falar com suporte
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
