'use client'

import { useEffect, useState } from 'react'
import { Order, OrderStatus } from '@/types'
import { formatCurrency, getPaymentLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import { Clock, Printer, Calendar, Star } from 'lucide-react'
import { playNewOrderSound } from '@/lib/notification-sound'
import { printCozinha, printEntrega } from '@/lib/print-receipt'

const COLUMNS: { status: OrderStatus; label: string; headerClass: string; bgClass: string }[] = [
  { status: 'recebido',   label: 'Recebido',        headerClass: 'bg-blue-500',   bgClass: 'bg-blue-50'   },
  { status: 'preparando', label: 'Preparando',       headerClass: 'bg-amber-500',  bgClass: 'bg-amber-50'  },
  { status: 'pronto',     label: 'Pronto',           headerClass: 'bg-green-500',  bgClass: 'bg-green-50'  },
  { status: 'saindo',     label: 'Saindo p/ entrega',headerClass: 'bg-purple-500', bgClass: 'bg-purple-50' },
  { status: 'entregue',   label: 'Entregue',         headerClass: 'bg-gray-400',   bgClass: 'bg-gray-50'   },
]

const COLUMN_ICON: Record<string, string> = {
  recebido: '📥', preparando: '👨‍🍳', pronto: '✅', saindo: '🛵', entregue: '🏁',
}

function getNextStatus(order: Order): OrderStatus | null {
  if (order.status === 'pronto' && order.type === 'balcao') return 'entregue'
  if (order.status === 'pronto' && order.type === 'delivery') return null // entregador assume
  const map: Partial<Record<OrderStatus, OrderStatus>> = {
    recebido: 'preparando',
    preparando: 'pronto',
    saindo: 'entregue',
  }
  return map[order.status] ?? null
}

function getAdvanceLabel(order: Order): string {
  if (order.status === 'saindo') return 'Entregar ✓'
  if (order.status === 'pronto' && order.type === 'balcao') return 'Entregar ✓'
  if (order.status === 'preparando') return 'Pronto ✓'
  return 'Avançar →'
}

function elapsed(createdAt: string, endAt?: string) {
  const end = endAt ? new Date(endAt).getTime() : Date.now()
  const diff = Math.floor((end - new Date(createdAt).getTime()) / 60000)
  if (diff < 60) return `${diff}min`
  return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? `${diff % 60}min` : ''}`
}

function elapsedColor(createdAt: string, status: OrderStatus) {
  if (status === 'entregue') return 'text-gray-400'
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (diff > 30) return 'text-red-500 font-semibold'
  if (diff > 15) return 'text-orange-500'
  return 'text-gray-400'
}

interface Props {
  initialOrders: Order[]
}


export default function PedidosClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [pendingDeliver, setPendingDeliver] = useState<Order | null>(null)
  const supabase = createClient()

  async function fetchAll() {
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*, addons:order_item_addons(*), variations:order_item_variations(*))')
      .not('status', 'eq', 'cancelado')
      .order('created_at', { ascending: false })
    if (data) setOrders(data as Order[])
  }

  useEffect(() => {
    // Polling a cada 30s — fallback caso o Realtime perca algum evento
    const poll = setInterval(fetchAll, 30_000)

    const channel = supabase
      .channel('pedidos-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const novo = payload.new as Order
        // Busca pedido completo com itens (payload do Realtime não inclui joins)
        const { data } = await supabase
          .from('orders')
          .select('*, items:order_items(*, addons:order_item_addons(*), variations:order_item_variations(*))')
          .eq('id', novo.id)
          .single()
        if (data) {
          setOrders((prev) => prev.find((o) => o.id === data.id) ? prev : [data as Order, ...prev])
        }
        playNewOrderSound()
        toast.success(`🛎 Novo pedido #${novo.order_number}!`, { duration: 6000 })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as Order
        if (updated.status === 'cancelado') {
          setOrders((prev) => prev.filter((o) => o.id !== updated.id))
        } else {
          setOrders((prev) => prev.map((o) =>
            o.id === updated.id ? { ...o, status: updated.status } : o
          ))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [])

  async function advanceStatus(order: Order) {
    const next = getNextStatus(order)
    if (!next) return
    if (next === 'entregue') { setPendingDeliver(order); return }
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: next } : o))
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
    if (error) {
      toast.error('Erro ao atualizar — rode a migration 006 no Supabase')
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: order.status } : o))
    }
  }

  async function confirmDeliver() {
    const order = pendingDeliver
    if (!order) return
    setPendingDeliver(null)
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: 'entregue' } : o))
    const { error } = await supabase.from('orders').update({ status: 'entregue' }).eq('id', order.id)
    if (error) {
      toast.error('Erro ao marcar como entregue')
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: order.status } : o))
    }
  }

  function imprimir(order: Order, tipo: 'cozinha' | 'entrega') {
    if (tipo === 'cozinha') printCozinha(order)
    else printEntrega(order)
  }

  async function cancelOrder(order: Order) {
    if (!confirm(`Cancelar pedido #${order.order_number}?`)) return
    setOrders((prev) => prev.filter((o) => o.id !== order.id))
    const { error } = await supabase.from('orders').update({ status: 'cancelado' }).eq('id', order.id)
    if (error) {
      toast.error('Erro ao cancelar pedido')
      setOrders((prev) => [order, ...prev])
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header fixo */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Fila de Pedidos</h1>
        <Link href="/admin/cozinha" className="text-sm text-orange-500 hover:underline">
          Visão cozinha →
        </Link>
      </div>

      {/* Board com scroll horizontal */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-3 h-full" style={{ minWidth: '900px' }}>
          {COLUMNS.map(({ status, label, headerClass, bgClass }) => {
            const col = orders.filter((o) => o.status === status)
            const isEntregue = status === 'entregue'

            return (
              <div key={status} className={`flex flex-col flex-1 min-w-[180px] max-w-[280px] rounded-2xl overflow-hidden`}>
                {/* Cabeçalho colorido */}
                <div className={`${headerClass} px-3 py-2.5 flex items-center justify-between shrink-0`}>
                  <span className="text-white font-semibold text-sm">
                    {COLUMN_ICON[status]} {label}
                  </span>
                  <span className="bg-white/30 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {col.length}
                  </span>
                </div>

                {/* Cards com scroll vertical */}
                <div className={`${bgClass} flex-1 overflow-y-auto p-2 space-y-2`}>
                  {col.length === 0 && (
                    <p className="text-gray-400 text-xs text-center py-8">Vazio</p>
                  )}
                  {col.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-white rounded-xl p-3 shadow-sm space-y-2 ${isEntregue ? 'opacity-55' : ''}`}
                    >
                      {/* Número + tempo */}
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">#{order.order_number}</span>
                        <span className={`flex items-center gap-0.5 text-xs ${elapsedColor(order.created_at, status)}`}>
                          <Clock className="h-3 w-3" />{elapsed(order.created_at, status === 'entregue' ? order.updated_at : undefined)}
                        </span>
                      </div>

                      {/* Cliente */}
                      <p className="text-sm font-medium text-gray-800 truncate">{order.customer_name}</p>

                      {/* Tipo + pagamento + extras */}
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {order.type === 'delivery' ? '🛵' : '🏪'} {order.type === 'delivery' ? 'Delivery' : 'Balcão'}
                        </Badge>
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {order.payment_method === 'dinheiro' ? '💵' : '💳'} {getPaymentLabel(order.payment_method ?? 'dinheiro')}
                        </Badge>
                        {order.coupon_code && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-0">
                            🏷 {order.coupon_code}
                          </Badge>
                        )}
                        {order.scheduled_for && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-0 flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" />
                            {new Date(order.scheduled_for).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </Badge>
                        )}
                      </div>

                      {/* Itens */}
                      <div className="space-y-0.5">
                        {order.items?.map((item) => (
                          <div key={item.id} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                            {item.quantity}× {item.product_name}
                          </div>
                        ))}
                      </div>

                      {/* Troco */}
                      {order.troco && (
                        <p className="text-xs text-gray-400">Troco p/ R$ {Number(order.troco).toFixed(2)}</p>
                      )}

                      {/* Aguardando entregador */}
                      {order.status === 'pronto' && order.type === 'delivery' && (
                        <p className="text-xs text-center text-purple-600 font-semibold bg-purple-50 rounded py-1">
                          🛵 Aguardando entregador
                        </p>
                      )}

                      {/* Avaliação */}
                      {order.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className="h-3.5 w-3.5" fill={(order.rating ?? 0) >= s ? '#f97316' : 'none'} stroke={(order.rating ?? 0) >= s ? '#f97316' : '#d1d5db'} strokeWidth={1.5} />
                          ))}
                          {order.rating_comment && (
                            <span className="text-[10px] text-gray-400 ml-1 truncate max-w-[100px]">"{order.rating_comment}"</span>
                          )}
                        </div>
                      )}

                      {/* Valor + ações */}
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="font-bold text-orange-500 text-sm">
                          {formatCurrency(order.total)}
                        </span>
                        {!isEntregue && (
                          <div className="flex gap-1 items-center">
                            <button
                              onClick={() => cancelOrder(order)}
                              className="text-xs text-red-400 hover:text-red-600 px-1"
                            >
                              ✕
                            </button>
                            {(['recebido', 'preparando'] as const).includes(order.status as any) && (
                              <button
                                onClick={() => imprimir(order, 'cozinha')}
                                title="Imprimir cozinha"
                                className="text-gray-400 hover:text-gray-700 px-1"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                            )}
                            {(['pronto', 'saindo'] as const).includes(order.status as any) && order.type === 'delivery' && (
                              <button
                                onClick={() => imprimir(order, 'entrega')}
                                title="Imprimir recibo entregador"
                                className="text-gray-400 hover:text-purple-600 px-1"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                            )}
                            {getNextStatus(order) && (
                              <Button
                                size="sm"
                                className="text-xs bg-orange-500 hover:bg-orange-600 text-white h-7 px-2"
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

      <Dialog open={!!pendingDeliver} onOpenChange={(o) => { if (!o) setPendingDeliver(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar entrega</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Marcar pedido <strong>#{pendingDeliver?.order_number}</strong> de <strong>{pendingDeliver?.customer_name}</strong> como entregue?
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setPendingDeliver(null)}>
              Não, foi engano
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={confirmDeliver}>
              Sim, confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
