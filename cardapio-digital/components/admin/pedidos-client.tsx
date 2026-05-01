'use client'

import { useEffect, useState } from 'react'
import { Order, OrderStatus } from '@/types'
import { formatCurrency, getOrderStatusLabel, getOrderStatusColor, getPaymentLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import { Clock } from 'lucide-react'

const COLUMNS: { status: OrderStatus; label: string; color: string }[] = [
  { status: 'recebido',   label: '📥 Recebido',           color: 'bg-blue-50'   },
  { status: 'preparando', label: '👨‍🍳 Preparando',          color: 'bg-yellow-50' },
  { status: 'pronto',     label: '✅ Pronto',              color: 'bg-green-50'  },
  { status: 'saindo',     label: '🛵 Saindo p/ entrega',   color: 'bg-purple-50' },
  { status: 'entregue',   label: '🏁 Entregue',            color: 'bg-gray-100'  },
]

function getNextStatus(order: Order): OrderStatus | null {
  if (order.status === 'pronto' && order.type === 'balcao') return 'entregue'
  const map: Partial<Record<OrderStatus, OrderStatus>> = {
    recebido: 'preparando',
    preparando: 'pronto',
    pronto: 'saindo',
    saindo: 'entregue',
  }
  return map[order.status] ?? null
}

function getAdvanceLabel(order: Order): string {
  if (order.status === 'saindo') return '✅ Entregar'
  if (order.status === 'pronto' && order.type === 'balcao') return '✅ Entregar'
  if (order.status === 'pronto') return '🛵 Saindo'
  if (order.status === 'preparando') return 'Pronto →'
  return 'Avançar →'
}

interface Props {
  initialOrders: Order[]
}

export default function PedidosClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('pedidos-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const novo = payload.new as Order
        setOrders((prev) => {
          if (prev.find((o) => o.id === novo.id)) return prev
          return [novo, ...prev]
        })
        toast.success(`Novo pedido #${novo.order_number}!`)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as Order
        if (updated.status === 'cancelado') {
          setOrders((prev) => prev.filter((o) => o.id !== updated.id))
        } else {
          // Mantém items/addons que o payload do Realtime não traz
          setOrders((prev) => prev.map((o) =>
            o.id === updated.id ? { ...o, status: updated.status } : o
          ))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function advanceStatus(order: Order) {
    const next = getNextStatus(order)
    if (!next) return

    // Atualização otimista: card move imediatamente
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: next } : o))

    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
    if (error) {
      toast.error('Erro ao atualizar status')
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: order.status } : o))
    }
  }

  async function cancelOrder(order: Order) {
    if (!confirm(`Cancelar pedido #${order.order_number}?`)) return

    // Atualização otimista: remove imediatamente
    setOrders((prev) => prev.filter((o) => o.id !== order.id))

    const { error } = await supabase.from('orders').update({ status: 'cancelado' }).eq('id', order.id)
    if (error) {
      toast.error('Erro ao cancelar pedido')
      setOrders((prev) => [order, ...prev])
    }
  }

  function elapsed(createdAt: string) {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
    return `${diff} min`
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fila de Pedidos</h1>
        <Link href="/admin/cozinha" className="text-sm text-orange-500 hover:underline">
          Visão cozinha →
        </Link>
      </div>

      {/* Board com scroll horizontal em telas menores */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-[1100px]">
          {COLUMNS.map(({ status, label, color }) => {
            const col = orders.filter((o) => o.status === status)
            const isEntregue = status === 'entregue'
            return (
              <div key={status} className={`flex-1 min-w-[200px] ${color} rounded-2xl p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-gray-700 text-sm">{label}</h2>
                  <Badge variant="outline" className="text-xs">{col.length}</Badge>
                </div>

                <div className="space-y-3">
                  {col.length === 0 && (
                    <p className="text-gray-400 text-xs text-center py-6">Vazio</p>
                  )}
                  {col.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-white rounded-xl p-3 shadow-sm space-y-2 ${isEntregue ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-900 text-sm">#{order.order_number}</p>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />{elapsed(order.created_at)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 font-medium">{order.customer_name}</p>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-gray-400">
                          {order.type === 'delivery' ? '🛵' : '🏪'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {order.payment_method === 'dinheiro' ? '💵' : '💳'}{' '}
                          {getPaymentLabel(order.payment_method ?? 'dinheiro')}
                          {order.troco ? ` · troco R$ ${Number(order.troco).toFixed(2)}` : ''}
                        </span>
                      </div>

                      {order.items?.map((item) => (
                        <div key={item.id} className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">
                          {item.quantity}× {item.product_name}
                        </div>
                      ))}

                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold text-orange-500 text-sm">
                          {formatCurrency(order.total)}
                        </span>
                        {!isEntregue && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-red-400 hover:text-red-600 px-2"
                              onClick={() => cancelOrder(order)}
                            >
                              Cancelar
                            </Button>
                            {getNextStatus(order) && (
                              <Button
                                size="sm"
                                className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2"
                                onClick={() => advanceStatus(order)}
                              >
                                {getAdvanceLabel(order)}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
