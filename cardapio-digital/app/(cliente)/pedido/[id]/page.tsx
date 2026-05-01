'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'
import { getOrderStatusLabel, getOrderStatusColor, formatCurrency, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { useParams } from 'next/navigation'

const STEPS = ['recebido', 'preparando', 'pronto', 'entregue'] as const

export default function PedidoPage() {
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', id)
        .single()
      setOrder(data as Order)
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
        setOrder((prev) => prev ? { ...prev, ...(payload.new as Order) } : null)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-gray-500 mb-4">Pedido não encontrado</p>
        <Link href="/" className={buttonVariants({ variant: 'default' })}>Voltar</Link>
      </div>
    )
  }

  const currentStep = STEPS.indexOf(order.status as typeof STEPS[number])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pedido #{order.order_number}</h1>
        <Badge className={`mt-2 ${getOrderStatusColor(order.status)}`}>
          {getOrderStatusLabel(order.status)}
        </Badge>
      </div>

      {order.status !== 'cancelado' && (
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center w-14">
                {idx <= currentStep ? (
                  <CheckCircle2 className={`h-6 w-6 ${idx <= currentStep ? 'text-orange-500' : 'text-gray-300'}`} />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300" />
                )}
                <span className={`text-[10px] mt-1 text-center leading-tight ${idx <= currentStep ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                  {getOrderStatusLabel(step)}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-0.5 w-4 shrink-0 ${idx < currentStep ? 'bg-orange-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <h2 className="font-semibold mb-3">Itens do pedido</h2>
        {order.items?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.quantity}x {item.product_name}</span>
            <span>{formatCurrency(item.total_price)}</span>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span className="text-orange-500">{formatCurrency(order.total)}</span>
        </div>
        <p className="text-xs text-gray-400 text-center">Pagamento {order.type === 'delivery' ? 'na entrega' : 'no balcão'}</p>
      </div>

      <Link href="/" className={cn(buttonVariants({ variant: 'outline' }), 'w-full mt-6 flex justify-center')}>
        Fazer novo pedido
      </Link>
    </div>
  )
}
