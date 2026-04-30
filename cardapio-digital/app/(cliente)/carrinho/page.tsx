'use client'

import { useCartStore } from '@/lib/store/cart'
import { formatCurrency, cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CarrinhoPage() {
  const { items, updateQuantity, removeItem, getSubtotal, getTotal, delivery_fee } = useCartStore()
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">🛒</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Carrinho vazio</h2>
        <p className="text-gray-500 mb-6">Adicione itens do cardápio para continuar</p>
        <Link href="/" className={cn(buttonVariants({ variant: 'default' }))}>Ver cardápio</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen">
      <div className="flex items-center gap-3 px-4 py-4 border-b">
        <button onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Carrinho</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            {item.image_url && (
              <div className="relative h-16 w-16 rounded-lg overflow-hidden shrink-0">
                <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{item.product_name}</p>
              {item.variations.length > 0 && (
                <p className="text-xs text-gray-500">{item.variations.map((v) => v.variation_name).join(', ')}</p>
              )}
              {item.addons.length > 0 && (
                <p className="text-xs text-gray-500">{item.addons.map((a) => a.addon_name).join(', ')}</p>
              )}
              {item.notes && <p className="text-xs text-gray-400 italic">"{item.notes}"</p>}
              <p className="text-sm font-bold text-orange-500 mt-1">{formatCurrency(item.unit_price * item.quantity)}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Separator className="mx-4" />

      <div className="px-4 py-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(getSubtotal())}</span>
        </div>
        {delivery_fee > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Taxa de entrega</span>
            <span>{formatCurrency(delivery_fee)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span>{formatCurrency(getTotal())}</span>
        </div>
      </div>

      <div className="px-4 pb-6">
        <Link
          href="/checkout"
          className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl text-base transition-colors"
        >
          Continuar para o pedido
        </Link>
      </div>
    </div>
  )
}
