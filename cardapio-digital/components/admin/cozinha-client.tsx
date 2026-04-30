'use client'

import { useEffect, useState } from 'react'
import { Order } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { getPaymentLabel } from '@/lib/utils'
import { toast } from 'sonner'
import { Clock, ToggleLeft, ToggleRight, X } from 'lucide-react'
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

export default function CozinhaClient({ initialOrders, initialProducts }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [products, setProducts] = useState<SimpleProduct[]>(initialProducts)
  const [showPanel, setShowPanel] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const interval = setInterval(() => setOrders((prev) => [...prev]), 30000)

    const channel = supabase
      .channel('cozinha-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        setOrders((prev) => [...prev, payload.new as Order])
        new Audio('/notify.mp3').play().catch(() => {})
        toast.success(`Novo pedido #${(payload.new as Order).order_number}!`)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as Order
        if (!['recebido', 'preparando'].includes(updated.status)) {
          setOrders((prev) => prev.filter((o) => o.id !== updated.id))
        } else {
          setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, ...updated } : o))
        }
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  async function markPreparando(id: string) {
    await supabase.from('orders').update({ status: 'preparando' }).eq('id', id)
  }

  async function markPronto(id: string) {
    await supabase.from('orders').update({ status: 'pronto' }).eq('id', id)
  }

  async function toggleProduct(product: SimpleProduct) {
    const next = !product.is_available
    const { error } = await supabase
      .from('products')
      .update({ is_available: next })
      .eq('id', product.id)

    if (error) {
      toast.error('Erro ao atualizar disponibilidade')
      return
    }
    setProducts((prev) =>
      prev.map((p) => p.id === product.id ? { ...p, is_available: next } : p)
    )
    toast.success(`${product.name} ${next ? 'ativado' : 'desativado'}`)
  }

  const paymentIcon = (method: string) => {
    if (method === 'dinheiro') return '💵'
    if (method === 'debito') return '💳'
    if (method === 'credito') return '💳'
    return '💰'
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
              <div
                key={p.id}
                className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2"
              >
                <span className={`text-sm ${p.is_available ? 'text-white' : 'text-gray-500 line-through'}`}>
                  {p.name}
                </span>
                <button onClick={() => toggleProduct(p)} className="shrink-0 ml-2">
                  {p.is_available
                    ? <ToggleRight className="h-6 w-6 text-green-400" />
                    : <ToggleLeft className="h-6 w-6 text-gray-500" />
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="text-center text-gray-400 py-20 text-lg">Nenhum pedido na fila</div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => {
          const mins = elapsed(order.created_at)
          const urgent = mins >= 15

          return (
            <div
              key={order.id}
              className={`rounded-2xl p-4 space-y-3 ${urgent ? 'bg-red-900 border border-red-500' : order.status === 'preparando' ? 'bg-yellow-900 border border-yellow-500' : 'bg-gray-800 border border-gray-700'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black">#{order.order_number}</span>
                <span className={`flex items-center gap-1 text-sm font-medium ${urgent ? 'text-red-300' : 'text-gray-300'}`}>
                  <Clock className="h-4 w-4" />
                  {mins} min
                </span>
              </div>

              <div className="space-y-0.5">
                <p className="text-sm text-gray-300">{order.type === 'delivery' ? '🛵 Delivery' : '🏪 Balcão'}</p>
                {order.table_number && <p className="text-sm text-gray-300">Mesa {order.table_number}</p>}
                <p className="text-xs text-gray-400">
                  {paymentIcon(order.payment_method)} {getPaymentLabel(order.payment_method)}
                  {order.troco ? ` · troco p/ R$ ${order.troco.toFixed(2)}` : ''}
                </p>
              </div>

              <div className="space-y-1.5">
                {order.items?.map((item) => (
                  <div key={item.id} className="bg-black/30 rounded-lg px-3 py-2">
                    <p className="font-bold">{item.quantity}x {item.product_name}</p>
                    {item.notes && <p className="text-xs text-yellow-300 mt-0.5">⚠ {item.notes}</p>}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                {order.status === 'recebido' && (
                  <Button
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                    onClick={() => markPreparando(order.id)}
                  >
                    Iniciar preparo
                  </Button>
                )}
                {order.status === 'preparando' && (
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold"
                    onClick={() => markPronto(order.id)}
                  >
                    Marcar pronto ✓
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
