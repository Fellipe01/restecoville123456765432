'use client'

import { useCartStore, calculateItemPrice } from '@/lib/store/cart'
import { formatCurrency, cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, ShoppingCart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Product } from '@/types'
import { toast } from 'sonner'

interface Props {
  upsellProducts: Product[]
}

function hasRequiredSelections(product: Product): boolean {
  return (
    (product.variation_groups?.some((g) => g.required) ?? false) ||
    (product.addon_groups?.some((g) => g.required) ?? false)
  )
}

export default function CarrinhoClient({ upsellProducts }: Props) {
  const { items, addItem, updateQuantity, removeItem, getSubtotal, getTotal, delivery_fee } = useCartStore()
  const router = useRouter()

  const cartProductIds = new Set(items.map((i) => i.product_id))
  const suggestions = upsellProducts.filter((p) => !cartProductIds.has(p.id) && p.is_available)

  function handleUpsellClick(product: Product) {
    if (hasRequiredSelections(product)) {
      router.push(`/item/${product.id}`)
      return
    }
    addItem({
      product_id: product.id,
      product_name: product.name,
      image_url: product.image_url ?? null,
      base_price: product.base_price,
      quantity: 1,
      unit_price: calculateItemPrice(product.base_price, [], []),
      notes: '',
      addons: [],
      variations: [],
    })
    toast.success(`${product.name} adicionado!`)
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-100">
          <button
            onClick={() => router.back()}
            aria-label="Voltar"
            className="h-10 w-10 -ml-2 flex items-center justify-center rounded-full active:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold">Carrinho</h1>
        </div>
        <div className="px-4 py-20 text-center">
          <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-orange-50 mb-5">
            <ShoppingCart className="h-12 w-12 text-orange-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Carrinho vazio</h2>
          <p className="text-gray-500 text-sm mb-6">Adicione itens do cardápio para continuar</p>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: 'default' }), 'bg-orange-500 hover:bg-orange-600 rounded-xl px-6 h-11')}
          >
            Ver cardápio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white flex items-center gap-3 px-4 h-14 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          className="h-10 w-10 -ml-2 flex items-center justify-center rounded-full active:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900 leading-tight">Seu carrinho</h1>
          <p className="text-[11px] text-gray-400">{items.length} {items.length === 1 ? 'item' : 'itens'}</p>
        </div>
      </div>

      {/* Lista de itens */}
      <div className="bg-white mt-3 mx-4 rounded-2xl shadow-sm divide-y divide-gray-100">
        {items.map((item) => {
          const primaryVar = item.variations[0]
          const displayName = primaryVar ? primaryVar.variation_name : item.product_name
          const displayImage = primaryVar?.image_url || item.image_url
          const otherVariations = item.variations.slice(1)

          return (
            <div key={item.id} className="flex gap-3 p-3">
              {displayImage ? (
                <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                  <Image src={displayImage} alt={displayName} fill sizes="64px" className="object-cover" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-xl shrink-0 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                  <span className="text-2xl">🍽️</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 leading-tight">{displayName}</p>
                {primaryVar && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{item.product_name}</p>
                )}
                {otherVariations.length > 0 && (
                  <p className="text-[11px] text-gray-500 mt-0.5">{otherVariations.map((v) => v.variation_name).join(' · ')}</p>
                )}
                {item.addons.length > 0 && (
                  <p className="text-[11px] text-gray-500 mt-0.5">+ {item.addons.map((a) => a.addon_name).join(', ')}</p>
                )}
                {item.notes && (
                  <p className="text-[11px] text-gray-400 italic mt-0.5 line-clamp-1">&ldquo;{item.notes}&rdquo;</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold text-orange-500">{formatCurrency(item.unit_price * item.quantity)}</p>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg h-8 px-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Diminuir"
                      className="h-7 w-7 flex items-center justify-center rounded active:bg-gray-200"
                    >
                      <Minus className="h-3.5 w-3.5 text-gray-700" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="Aumentar"
                      className="h-7 w-7 flex items-center justify-center rounded active:bg-gray-200"
                    >
                      <Plus className="h-3.5 w-3.5 text-gray-700" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                aria-label={`Remover ${item.product_name}`}
                className="h-8 w-8 -mr-1 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Upsell */}
      {suggestions.length > 0 && (
        <div className="mt-5 px-4">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="h-4 w-4 text-orange-500" />
            <h2 className="font-bold text-gray-900 text-sm">Que tal adicionar mais?</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {suggestions.map((product) => (
              <button
                key={product.id}
                onClick={() => handleUpsellClick(product)}
                className="flex-shrink-0 w-36 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.97] transition-transform text-left"
              >
                {product.image_url ? (
                  <div className="relative h-24 w-full bg-gray-100">
                    <Image src={product.image_url} alt={product.name} fill sizes="144px" className="object-cover" />
                  </div>
                ) : (
                  <div className="h-24 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                    <span className="text-3xl">🍽️</span>
                  </div>
                )}
                <div className="p-2.5">
                  <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight min-h-[28px]">{product.name}</p>
                  <p className="text-sm font-bold text-orange-500 mt-1">{formatCurrency(product.base_price)}</p>
                  <div className="mt-2 flex items-center justify-center gap-1 bg-orange-500 text-white text-[11px] font-bold rounded-lg py-1.5">
                    <Plus className="h-3 w-3" strokeWidth={3} />
                    Adicionar
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="bg-white mt-5 mx-4 rounded-2xl shadow-sm p-4 space-y-2.5">
        <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Resumo</p>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span className="font-medium">{formatCurrency(getSubtotal())}</span>
        </div>
        {delivery_fee > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Taxa de entrega</span>
            <span className="font-medium">{formatCurrency(delivery_fee)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
          <span>Total</span>
          <span className="text-orange-500">{formatCurrency(getTotal())}</span>
        </div>
      </div>

      {/* CTA fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 max-w-md mx-auto">
        <Link
          href="/checkout"
          className="flex items-center justify-between bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-5 rounded-2xl shadow-md shadow-orange-500/30 transition-colors active:scale-[0.99]"
        >
          <span className="text-sm">Continuar</span>
          <span className="text-base">{formatCurrency(getTotal())}</span>
        </Link>
      </div>
    </div>
  )
}
