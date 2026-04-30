'use client'

import { Order, OrderStatus } from '@/types'
import { formatCurrency, getOrderStatusLabel, getOrderStatusColor, formatPhone } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_OPTIONS: OrderStatus[] = ['recebido', 'preparando', 'pronto', 'entregue', 'cancelado']

interface Props {
  order: Order
}

export default function PedidoDetalheClient({ order: initialOrder }: Props) {
  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function updateStatus(status: OrderStatus) {
    setLoading(true)
    const { error } = await supabase.from('orders').update({ status }).eq('id', order.id)
    if (error) {
      toast.error('Erro ao atualizar')
    } else {
      setOrder({ ...order, status })
      toast.success('Status atualizado')
    }
    setLoading(false)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Pedido #{order.order_number}</h1>
        <Badge className={getOrderStatusColor(order.status)}>{getOrderStatusLabel(order.status)}</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="font-semibold text-gray-700">Cliente</h2>
          <p className="text-gray-900">{order.customer_name}</p>
          <p className="text-gray-500 text-sm">{formatPhone(order.customer_phone)}</p>
          <p className="text-sm">{order.type === 'delivery' ? '🛵 Delivery' : '🏪 Balcão'}</p>
          {order.table_number && <p className="text-sm text-gray-500">Mesa: {order.table_number}</p>}
          {order.address && <p className="text-sm text-gray-500">{order.address}</p>}
          {order.notes && <p className="text-sm text-gray-400 italic">"{order.notes}"</p>}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="font-semibold text-gray-700">Alterar Status</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                disabled={loading || order.status === s}
                onClick={() => updateStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  order.status === s ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600 hover:border-orange-500 hover:text-orange-600'
                }`}
              >
                {getOrderStatusLabel(s)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Itens</h2>
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
        </div>
        <div className="space-y-3">
          {order.items?.map((item) => (
            <div key={item.id} className="border-b last:border-0 pb-3 last:pb-0">
              <div className="flex justify-between">
                <p className="font-medium">{item.quantity}x {item.product_name}</p>
                <p className="font-bold">{formatCurrency(item.total_price)}</p>
              </div>
              {item.variations?.map((v) => (
                <p key={v.id} className="text-xs text-gray-500 ml-4">· {v.group_name}: {v.variation_name}</p>
              ))}
              {item.addons?.map((a) => (
                <p key={a.id} className="text-xs text-gray-500 ml-4">+ {a.addon_name} ({formatCurrency(a.price)})</p>
              ))}
              {item.notes && <p className="text-xs text-gray-400 ml-4 italic">"{item.notes}"</p>}
            </div>
          ))}
        </div>
        <Separator className="my-3" />
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.delivery_fee > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Taxa de entrega</span><span>{formatCurrency(order.delivery_fee)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base">
            <span>Total</span><span className="text-orange-500">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
