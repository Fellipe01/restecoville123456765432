'use client'

import { Order } from '@/types'
import { formatCurrency, buildWhatsAppMessage, cn, getPaymentLabel } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { CheckCircle2, MessageCircle, Package, Home } from 'lucide-react'
import Link from 'next/link'

interface Props {
  order: Order
  whatsapp?: string | null
}

export default function ConfirmacaoClient({ order, whatsapp }: Props) {
  const items = order.items ?? []
  const waMessage = buildWhatsAppMessage(
    order.order_number,
    items.map((i) => ({ name: i.product_name, qty: i.quantity, price: i.unit_price })),
    order.total
  )
  const waUrl = whatsapp ? `https://wa.me/55${whatsapp.replace(/\D/g, '')}?text=${waMessage}` : null

  const paymentInfo = () => {
    const method = getPaymentLabel(order.payment_method ?? 'dinheiro')
    const local = order.type === 'delivery' ? 'na entrega' : 'no balcão'
    const troco = order.troco ? ` · troco p/ R$ ${Number(order.troco).toFixed(2)}` : ''
    return `${method}${troco} — pague ${local}`
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-8">
      {/* Hero verde de sucesso */}
      <div className="relative bg-gradient-to-br from-emerald-400 to-emerald-600 px-6 pt-16 pb-12 text-center overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-10 h-48 w-48 rounded-full bg-white/10" />

        <div className="relative">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-white shadow-xl mb-4 animate-in zoom-in duration-500">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white drop-shadow">Pedido recebido!</h1>
          <p className="text-white/85 text-sm mt-1">Já estamos preparando tudo para você</p>
        </div>
      </div>

      {/* Card do número do pedido (sobreposto ao hero) */}
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
          <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Número do pedido</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">#{order.order_number}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-full">
            <span className="text-[11px] font-semibold text-orange-700">{paymentInfo()}</span>
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Resumo</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate pr-2">{item.quantity}× {item.product_name}</span>
                <span className="font-medium text-gray-900 shrink-0">{formatCurrency(item.total_price)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Taxa de entrega</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base">
              <span className="text-gray-900">Total</span>
              <span className="text-orange-500">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-4 mt-5 space-y-3">
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold h-12 px-4 rounded-2xl text-sm shadow-md shadow-emerald-500/30 transition-all"
          >
            <MessageCircle className="h-5 w-5" />
            Confirmar pelo WhatsApp
          </a>
        )}
        <Link
          href="/acompanhar"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'w-full h-12 rounded-2xl flex items-center justify-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 font-bold'
          )}
        >
          <Package className="h-4 w-4" />
          Acompanhar pedido
        </Link>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-gray-500 font-medium'
          )}
        >
          <Home className="h-4 w-4" />
          Voltar ao cardápio
        </Link>
      </div>
    </div>
  )
}
