'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'
import { getOrderStatusLabel, getOrderStatusColor, formatCurrency, cn } from '@/lib/utils'
import { CheckCircle2, Loader2, ClipboardList, ChefHat, PackageCheck, Bike, PartyPopper, ArrowLeft, Home } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { useParams, useRouter } from 'next/navigation'

const STEPS = ['recebido', 'preparando', 'pronto', 'entregue'] as const

const STEP_ICONS: Record<typeof STEPS[number], React.ComponentType<{ className?: string }>> = {
  recebido: ClipboardList,
  preparando: ChefHat,
  pronto: PackageCheck,
  entregue: PartyPopper,
}

export default function PedidoPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

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
      <div className="max-w-md mx-auto flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <p className="text-5xl mb-3">😔</p>
        <p className="text-gray-700 font-semibold mb-1">Pedido não encontrado</p>
        <p className="text-gray-400 text-sm mb-6">Verifique o link e tente novamente</p>
        <Link href="/" className={cn(buttonVariants({ variant: 'default' }), 'rounded-xl bg-orange-500 hover:bg-orange-600')}>
          Voltar ao cardápio
        </Link>
      </div>
    )
  }

  const currentStep = STEPS.indexOf(order.status as typeof STEPS[number])
  const isDelivery = order.type === 'delivery'

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-10">
      {/* Header */}
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

      {/* Cabeçalho do pedido */}
      <div className="px-4 pt-5">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/30">
          <p className="text-[11px] uppercase tracking-wider font-bold text-white/80">Pedido</p>
          <p className="text-3xl font-bold mt-0.5">#{order.order_number}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
            <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-bold">{getOrderStatusLabel(order.status)}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {order.status !== 'cancelado' && (
        <div className="px-4 mt-5">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-5">Status do pedido</h2>
            <div className="space-y-1">
              {STEPS.map((step, idx) => {
                const Icon = STEP_ICONS[step]
                const completed = idx < currentStep
                const active = idx === currentStep
                const future = idx > currentStep
                const last = idx === STEPS.length - 1

                // Para delivery, troca "entregue" por "saindo + entregue"
                const stepLabel = isDelivery && step === 'entregue' ? 'Entregue' : getOrderStatusLabel(step)

                return (
                  <div key={step} className="flex gap-3 relative">
                    <div className="flex flex-col items-center">
                      <div
                        className={`relative h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                          completed
                            ? 'bg-orange-500 text-white'
                            : active
                            ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                        {active && (
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-orange-500 ring-2 ring-white animate-ping" />
                        )}
                      </div>
                      {!last && (
                        <div className={`w-0.5 flex-1 my-1 min-h-[28px] ${completed ? 'bg-orange-500' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <p
                        className={`font-bold text-sm ${
                          completed || active ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {stepLabel}
                      </p>
                      {active && (
                        <p className="text-xs text-orange-600 font-medium mt-0.5">Em andamento agora</p>
                      )}
                      {completed && (
                        <p className="text-xs text-gray-400 mt-0.5">Concluído</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Itens do pedido */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Itens do pedido</h2>
          <div className="space-y-2">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate pr-2">{item.quantity}× {item.product_name}</span>
                <span className="font-medium text-gray-900 shrink-0">{formatCurrency(item.total_price)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold text-base">
            <span className="text-gray-900">Total</span>
            <span className="text-orange-500">{formatCurrency(order.total)}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
            {isDelivery ? <Bike className="h-3 w-3" /> : null}
            <span>Pagamento {isDelivery ? 'na entrega' : 'no balcão'}</span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-5">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'w-full h-12 rounded-2xl flex items-center justify-center gap-2 border-gray-200 text-gray-600 font-bold'
          )}
        >
          <Home className="h-4 w-4" />
          Fazer novo pedido
        </Link>
      </div>
    </div>
  )
}
