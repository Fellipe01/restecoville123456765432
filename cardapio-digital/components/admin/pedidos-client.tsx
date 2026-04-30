'use client'

import { useEffect, useState } from 'react'
import { Order, OrderStatus } from '@/types'
import { formatCurrency, getOrderStatusLabel, getOrderStatusColor, getPaymentLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Clock } from 'lucide-react'

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'recebido', label: '📥 Recebido' },
  { status: 'preparando', label: '👨‍🍳 Preparando' },
  { status: 'pronto', label: '✅ Pronto' },
]

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  recebido: 'preparando',
  preparando: 'pronto',
  pronto: 'entregue',
}

interface Props {
  initialOrders: Order[]
}

export default function PedidosClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const channel = supabase
      .channel('pedidos-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        setOrders((prev) => [payload.new as Order, ...prev])
        new Audio('/notify.mp3').play().catch(() => {})
        toast.success(`Novo pedido #${(payload.new as Order).order_number}!`)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as Order
        if (['entregue', 'cancelado'].includes(updated.status)) {
          setOrders((prev) => prev.filter((o) => o.id !== updated.id))
        } else {
          setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, ...updated } : o))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function advanceStatus(order: Order) {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
    if (error) toast.error('Erro ao atualizar status')
  }

  async function cancelOrder(order: Order) {
    const { error } = await supabase.from('orders').update({ status: 'cancelado' }).eq('id', order.id)
    if (error) toast.error('Erro ao cancelar pedido')
  }

  function elapsed(createdAt: string) {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
    return `${diff} min`
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fila de Pedidos</h1>
        <Link href="/admin/cozinha" className="text-sm text-orange-500 hover:underline">Visão cozinha →</Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {COLUMNS.map(({ status, label }) => {
          const col = orders.filter((o) => o.status === status)
          return (
            <div key={status} className="bg-gray-100 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-700">{label}</h2>
                <Badge variant="outline">{col.length}</Badge>
              </div>
              <div className="space-y-3">
                {col.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Vazio</p>}
                {col.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl p-3 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900">#{order.order_number}</p>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />{elapsed(order.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{order.customer_name}</p>
                    <p className="text-xs text-gray-400">{order.type === 'delivery' ? '🛵 Delivery' : '🏪 Balcão'}</p>
                    <p className="text-xs text-gray-400">
                      {order.payment_method === 'dinheiro' ? '💵' : '💳'} {getPaymentLabel(order.payment_method ?? 'dinheiro')}
                      {order.troco ? ` · troco p/ R$ ${Number(order.troco).toFixed(2)}` : ''}
                    </p>

                    {order.items?.map((item) => (
                      <div key={item.id} className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">
                        {item.quantity}x {item.product_name}
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold text-orange-500 text-sm">{formatCurrency(order.total)}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-red-500 hover:text-red-700"
                          onClick={() => cancelOrder(order)}
                        >
                          Cancelar
                        </Button>
                        {NEXT_STATUS[order.status] && (
                          <Button
                            size="sm"
                            className="text-xs bg-orange-500 hover:bg-orange-600 text-white"
                            onClick={() => advanceStatus(order)}
                          >
                            {order.status === 'pronto' ? 'Entregar' : 'Avançar →'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
