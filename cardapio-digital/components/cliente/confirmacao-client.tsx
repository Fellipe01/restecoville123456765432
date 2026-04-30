'use client'

import { Order } from '@/types'
import { formatCurrency, buildWhatsAppMessage, cn, getPaymentLabel } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, MessageCircle } from 'lucide-react'
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
    <div className="max-w-2xl mx-auto px-4 py-10 text-center">
      <div className="flex justify-center mb-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Pedido recebido!</h1>
      <p className="text-gray-500 mb-1">Pedido <strong>#{order.order_number}</strong></p>
      <p className="text-sm text-gray-400 mb-6">{paymentInfo()}</p>

      <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.quantity}x {item.product_name}</span>
            <span className="font-medium">{formatCurrency(item.total_price)}</span>
          </div>
        ))}
        <Separator />
        {order.delivery_fee > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Taxa de entrega</span>
            <span>{formatCurrency(order.delivery_fee)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span className="text-orange-500">{formatCurrency(order.total)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors text-base"
          >
            <MessageCircle className="h-5 w-5" />
            Confirmar pelo WhatsApp
          </a>
        )}
        <Link
          href={`/pedido/${order.id}`}
          className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-center')}
        >
          Acompanhar pedido
        </Link>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-center')}
        >
          Voltar ao cardápio
        </Link>
      </div>
    </div>
  )
}
