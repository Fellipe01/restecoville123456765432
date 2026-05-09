'use client'

import { useState, useEffect, useMemo } from 'react'
import { useCustomerStore } from '@/lib/store/customer'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'
import { formatCurrency, getOrderStatusLabel, maskPhone } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, MessageCircle, RefreshCw, Package, Bike, Store } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  restaurantId: string
  whatsappNumber: string | null
}

const STATUS_MESSAGE: Record<string, { icon: string; text: string; bg: string; text_color: string; ring: string }> = {
  recebido:   { icon: '📋', text: 'Recebemos seu pedido e já vamos começar!',         bg: 'bg-blue-50',   text_color: 'text-blue-700',   ring: 'ring-blue-200'   },
  preparando: { icon: '👨‍🍳', text: 'Estamos preparando seu pedido com carinho.',        bg: 'bg-amber-50',  text_color: 'text-amber-700',  ring: 'ring-amber-200'  },
  pronto:     { icon: '✅', text: 'Pedido pronto! Aguardando o entregador.',           bg: 'bg-emerald-50',text_color: 'text-emerald-700',ring: 'ring-emerald-200'},
  saindo:     { icon: '🛵', text: 'O entregador acabou de sair com seu pedido!',       bg: 'bg-purple-50', text_color: 'text-purple-700', ring: 'ring-purple-200' },
  entregue:   { icon: '🎉', text: 'Pedido entregue. Bom apetite!',                    bg: 'bg-gray-50',   text_color: 'text-gray-600',   ring: 'ring-gray-200'   },
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
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!phone) return
    fetchOrders(phone)
    const interval = setInterval(() => fetchOrders(phone), 30_000)
    return () => clearInterval(interval)
  }, [phone])

  async function fetchOrders(p: string) {
    setLoading(true)
    // Normaliza: mantém apenas dígitos — previne injeção no filtro PostgREST
    const digits = p.replace(/\D/g, '')
    // Mínimo 10 dígitos (DDD + número) para números brasileiros
    if (digits.length < 10 || digits.length > 15) {
      setOrders([])
      setLoading(false)
      return
    }
    // Usa .in() com valores sanitizados em vez de .or() com interpolação livre
    const phones = Array.from(new Set([p.trim(), digits]))
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .in('customer_phone', phones)
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
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="flex items-center gap-3 px-4 h-14">
            <button
              onClick={() => router.push('/')}
              aria-label="Voltar"
              className="h-10 w-10 -ml-2 flex items-center justify-center rounded-full active:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-base font-bold text-gray-900">Acompanhar pedido</h1>
          </div>
        </div>

        <div className="px-4 pt-10 pb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 mb-5 shadow-lg shadow-orange-500/30">
              <Package className="h-10 w-10 text-white" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Onde está meu pedido?</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Digite o WhatsApp usado no pedido para ver o status em tempo real
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-gray-600 font-medium">Número de WhatsApp</Label>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                value={inputPhone}
                onChange={(e) => setInputPhone(maskPhone(e.target.value))}
                className="mt-1.5 h-12 rounded-xl border-gray-200 bg-white focus-visible:ring-orange-500/30 text-base"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !inputPhone.trim()}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 font-bold rounded-2xl text-sm shadow-md shadow-orange-500/30"
            >
              {loading ? 'Buscando...' : 'Buscar meus pedidos'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // ─── Tela de pedidos ───────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex items-center justify-between gap-3 px-4 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/')}
              aria-label="Voltar"
              className="h-10 w-10 -ml-2 flex items-center justify-center rounded-full active:bg-gray-100 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 text-sm leading-tight truncate">
                {orders[0]?.customer_name ? `Olá, ${orders[0].customer_name.split(' ')[0]}!` : 'Meus pedidos'}
              </h1>
              <p className="text-[11px] text-gray-400 truncate">{phone} · atualiza a cada 30s</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => fetchOrders(phone)}
              disabled={loading}
              aria-label="Atualizar"
              className="h-10 w-10 flex items-center justify-center text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-full disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="px-4 pb-3 -mt-1">
          <button
            onClick={handleClear}
            className="text-[11px] text-gray-400 underline hover:text-gray-600"
          >
            Sou outra pessoa
          </button>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-block h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-500 text-sm">Buscando pedidos...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 px-4">
          <p className="text-5xl mb-3">🍽️</p>
          <p className="font-bold text-gray-800">Nenhum pedido em andamento</p>
          <p className="text-sm text-gray-500 mt-1.5 max-w-xs mx-auto">
            Os pedidos aparecem aqui enquanto estão sendo preparados
          </p>
          <Link
            href="/"
            className="mt-6 inline-block bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl px-5 h-11 leading-[2.75rem] shadow-md shadow-orange-500/30"
          >
            Ver cardápio
          </Link>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-4">
          {orders.map((order) => {
            const msg = STATUS_MESSAGE[order.status]
            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Cabeçalho com gradiente */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-bold text-white/80">Pedido</p>
                      <p className="text-xl font-bold leading-tight">#{order.order_number}</p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
                      <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                      <span className="text-[11px] font-bold">{getOrderStatusLabel(order.status)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Mensagem de status */}
                  {msg && (
                    <div className={`flex items-start gap-3 rounded-xl px-3 py-3 ${msg.bg} ring-1 ${msg.ring}`}>
                      <span className="text-2xl shrink-0">{msg.icon}</span>
                      <p className={`text-sm font-semibold leading-tight ${msg.text_color}`}>{msg.text}</p>
                    </div>
                  )}

                  {/* Tipo */}
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                    {order.type === 'delivery' ? <Bike className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
                    <span>{order.type === 'delivery' ? 'Delivery' : 'Retirada no balcão'}</span>
                  </div>

                  {/* Itens */}
                  <div className="text-sm space-y-1 border-t border-gray-100 pt-3">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-gray-600 truncate pr-2">{item.quantity}× {item.product_name}</span>
                        <span className="text-gray-400 shrink-0">{formatCurrency(item.total_price)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="font-bold text-base text-orange-500">{formatCurrency(order.total)}</span>
                  </div>

                  {/* Botão WhatsApp */}
                  {whatsappNumber && (
                    <a
                      href={buildWhatsAppLink(whatsappNumber, order.order_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold h-11 rounded-xl text-sm transition-all shadow-md shadow-emerald-500/20"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Falar com suporte
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
