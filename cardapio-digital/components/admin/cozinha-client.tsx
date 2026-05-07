'use client'

import { useEffect, useState, useCallback } from 'react'
import { Order } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { getPaymentLabel } from '@/lib/utils'
import { toast } from 'sonner'
import { Clock, Printer, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SimpleProduct {
  id: string
  name: string
  is_available: boolean
}

interface Props {
  initialOrders: Order[]
  initialProducts: SimpleProduct[]
}

function elapsed(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
}

const paymentIcon = (method: string) =>
  method === 'dinheiro' ? '💵' : '💳'

export default function CozinhaClient({ initialOrders, initialProducts }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [products, setProducts] = useState<SimpleProduct[]>(initialProducts)
  const [showPanel, setShowPanel] = useState(false)
  const [tick, setTick] = useState(0)
  const supabase = createClient()

  // Força re-render a cada 60s para atualizar os tempos
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])

  async function fetchAtivos() {
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .in('status', ['recebido', 'preparando'])
      .order('created_at', { ascending: true })
    if (data) setOrders(data as Order[])
  }

  useEffect(() => {
    const poll = setInterval(fetchAtivos, 30_000)

    const channel = supabase
      .channel('cozinha-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const novo = payload.new as Order
        // Busca o pedido completo com itens
        const { data } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('id', novo.id)
          .single()
        if (data) {
          setOrders((prev) => prev.find((o) => o.id === data.id) ? prev : [...prev, data as Order])
        }
        new Audio('/notify.mp3').play().catch(() => {})
        toast.success(`🛎 Novo pedido #${novo.order_number}!`, { duration: 6000 })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as Order
        if (!['recebido', 'preparando'].includes(updated.status)) {
          setOrders((prev) => prev.filter((o) => o.id !== updated.id))
        } else {
          setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, status: updated.status } : o))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [])

  async function imprimir(order: Order) {
    const { error } = await supabase.from('print_jobs').insert({ order_id: order.id, type: 'cozinha' })
    if (error) toast.error('Erro ao enviar para impressora')
    else toast.success('Enviado para impressora 🖨️')
  }

  async function markPreparando(order: Order) {
    // Optimistic: muda status imediatamente
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: 'preparando' } : o))
    const { error } = await supabase.from('orders').update({ status: 'preparando' }).eq('id', order.id)
    if (error) {
      toast.error('Erro ao atualizar')
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: order.status } : o))
    }
  }

  async function markPronto(order: Order) {
    // Optimistic: remove o card imediatamente
    setOrders((prev) => prev.filter((o) => o.id !== order.id))
    const { error } = await supabase.from('orders').update({ status: 'pronto' }).eq('id', order.id)
    if (error) {
      toast.error('Erro ao marcar como pronto')
      setOrders((prev) => [...prev, order].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
    } else {
      toast.success(`Pedido #${order.order_number} pronto! ✅`)
    }
  }

  async function toggleProduct(product: SimpleProduct) {
    const next = !product.is_available
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_available: next } : p))
    const { error } = await supabase.from('products').update({ is_available: next }).eq('id', product.id)
    if (error) {
      toast.error('Erro ao atualizar disponibilidade')
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_available: !next } : p))
    } else {
      toast.success(`${product.name} ${next ? 'ativado' : 'desativado'}`)
    }
  }

  return (
    <div className="p-4 bg-gray-900 min-h-screen text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🍳 Visão Cozinha</h1>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <ToggleLeft className="h-4 w-4" />
          Disponibilidade
        </button>
      </div>

      {/* Painel 86-list */}
      {showPanel && (
        <div className="mb-6 bg-gray-800 rounded-2xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-200">Ativar / Desativar itens</h2>
            <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
                <span className={`text-sm ${p.is_available ? 'text-white' : 'text-gray-500 line-through'}`}>
                  {p.name}
                </span>
                <button onClick={() => toggleProduct(p)} className="shrink-0 ml-2">
                  {p.is_available
                    ? <ToggleRight className="h-6 w-6 text-green-400" />
                    : <ToggleLeft className="h-6 w-6 text-gray-500" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="text-center text-gray-400 py-20 text-lg">Nenhum pedido na fila 🎉</div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => {
          const mins = elapsed(order.created_at)
          const urgent = mins >= 15
          const isPreparando = order.status === 'preparando'

          return (
            <div
              key={order.id}
              className={`rounded-2xl p-4 space-y-3 border ${
                urgent
                  ? 'bg-red-900 border-red-500'
                  : isPreparando
                  ? 'bg-yellow-900 border-yellow-500'
                  : 'bg-gray-800 border-gray-700'
              }`}
            >
              {/* Cabeçalho */}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black">#{order.order_number}</span>
                <span className={`flex items-center gap-1 text-sm font-semibold ${urgent ? 'text-red-300' : 'text-gray-300'}`}>
                  <Clock className="h-4 w-4" />
                  {mins} min
                </span>
              </div>

              {/* Info */}
              <div className="space-y-0.5">
                <p className="text-sm text-gray-300">
                  {order.type === 'delivery' ? '🛵 Delivery' : '🏪 Balcão'}
                  {order.table_number ? ` · Mesa ${order.table_number}` : ''}
                </p>
                <p className="text-xs text-gray-400">
                  {paymentIcon(order.payment_method)} {getPaymentLabel(order.payment_method)}
                  {order.troco ? ` · troco p/ R$ ${Number(order.troco).toFixed(2)}` : ''}
                </p>
                {order.notes && (
                  <p className="text-xs text-yellow-300">📝 {order.notes}</p>
                )}
              </div>

              {/* Itens */}
              <div className="space-y-1.5">
                {order.items?.map((item) => (
                  <div key={item.id} className="bg-black/30 rounded-lg px-3 py-2">
                    <p className="font-bold text-sm">{item.quantity}x {item.product_name}</p>
                    {item.notes && <p className="text-xs text-yellow-300 mt-0.5">⚠ {item.notes}</p>}
                  </div>
                ))}
              </div>

              {/* Ação */}
              <div className="pt-1 space-y-2">
                {order.status === 'recebido' && (
                  <Button
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                    onClick={() => markPreparando(order)}
                  >
                    Iniciar preparo
                  </Button>
                )}
                {order.status === 'preparando' && (
                  <Button
                    className="w-full bg-green-500 hover:bg-green-400 text-white font-bold"
                    onClick={() => markPronto(order)}
                  >
                    Marcar pronto ✓
                  </Button>
                )}
                <button
                  onClick={() => imprimir(order)}
                  className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white text-sm py-1 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Printer className="h-4 w-4" /> Imprimir cozinha
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
