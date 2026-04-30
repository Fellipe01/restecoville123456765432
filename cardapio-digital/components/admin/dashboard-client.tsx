'use client'

import { useEffect, useRef } from 'react'
import { Order } from '@/types'
import { formatCurrency, getOrderStatusLabel, getOrderStatusColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ShoppingBag, DollarSign, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface Props {
  orders: Order[]
  activeOrders: Order[]
}

export default function DashboardClient({ orders, activeOrders }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevCountRef = useRef(activeOrders.length)

  const totalRevenue = orders.reduce((acc, o) => o.status !== 'cancelado' ? acc + o.total : acc, 0)
  const avgTicket = orders.length > 0 ? totalRevenue / orders.filter((o) => o.status !== 'cancelado').length : 0
  const newOrders = orders.filter((o) => o.status === 'recebido').length

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        audioRef.current?.play().catch(() => {})
        router.refresh()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* alerta sonoro: áudio silencioso gerado em runtime */}
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAA..." />

      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500 font-medium flex items-center gap-2"><ShoppingBag className="h-4 w-4" />Pedidos hoje</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{orders.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500 font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" />Faturamento</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500 font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" />Ticket médio</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{formatCurrency(avgTicket)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500 font-medium flex items-center gap-2"><Clock className="h-4 w-4" />Em aberto</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeOrders.length}</p>
            {newOrders > 0 && <Badge className="bg-orange-500 text-white text-xs mt-1">{newOrders} novo{newOrders > 1 ? 's' : ''}</Badge>}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Pedidos ativos</h2>
          <Link href="/admin/pedidos" className="text-sm text-orange-500 hover:underline">Ver todos</Link>
        </div>
        {activeOrders.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">Nenhum pedido ativo</p>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <Link key={order.id} href={`/admin/pedidos/${order.id}`}>
                <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">#{order.order_number} — {order.customer_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {order.type === 'delivery' ? '🛵 Delivery' : '🏪 Balcão'} · {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={getOrderStatusColor(order.status)}>{getOrderStatusLabel(order.status)}</Badge>
                    <p className="text-sm font-bold text-orange-500">{formatCurrency(order.total)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Todos os pedidos de hoje</h2>
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">Pedido</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/pedidos/${order.id}`)}>
                  <td className="px-4 py-3 font-bold">#{order.order_number}</td>
                  <td className="px-4 py-3">{order.customer_name}</td>
                  <td className="px-4 py-3">{order.type === 'delivery' ? '🛵' : '🏪'}</td>
                  <td className="px-4 py-3"><Badge className={getOrderStatusColor(order.status)}>{getOrderStatusLabel(order.status)}</Badge></td>
                  <td className="px-4 py-3 text-right font-bold">{formatCurrency(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
