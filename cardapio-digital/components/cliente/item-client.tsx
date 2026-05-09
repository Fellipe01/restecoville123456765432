'use client'

import { useState } from 'react'
import { Product, VariationGroup, AddonGroup, CartItemVariation, CartItemAddon, Variation } from '@/types'
import { useCartStore, calculateItemPrice } from '@/lib/store/cart'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Minus, Plus, Check, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  product: Product
}

export default function ItemClient({ product }: Props) {
  const router = useRouter()
  const { addItem, getItemCount } = useCartStore()
  const cartCount = getItemCount()

  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [selectedVariations, setSelectedVariations] = useState<CartItemVariation[]>([])
  const [selectedAddons, setSelectedAddons] = useState<CartItemAddon[]>([])
  const [showOutroSabor, setShowOutroSabor] = useState(false)

  // Grupo de variação único (max_selections=1) que permite sugestão de outro sabor
  const saborGroup = product.variation_groups?.find((g) => g.max_selections === 1 && (g.variations?.filter((v) => v.is_available).length ?? 0) > 1) ?? null

  const unitPrice = calculateItemPrice(product.base_price, selectedVariations, selectedAddons)
  const totalPrice = unitPrice * quantity

  function handleVariationSelect(group: VariationGroup, variationId: string, variationName: string, priceModifier: number, imageUrl?: string | null) {
    setSelectedVariations((prev) => {
      const entry = { variation_id: variationId, variation_name: variationName, group_name: group.name, group_id: group.id, price_modifier: priceModifier, image_url: imageUrl }
      const others = prev.filter((v) => v.group_id !== group.id)
      if (group.max_selections === 1) {
        return [...others, entry]
      }
      const exists = prev.find((v) => v.variation_id === variationId)
      if (exists) return prev.filter((v) => v.variation_id !== variationId)
      const groupSelected = prev.filter((v) => v.group_id === group.id)
      if (groupSelected.length >= group.max_selections) return prev
      return [...prev, entry]
    })
  }

  function handleAddonToggle(addon_id: string, addon_name: string, price: number, group: AddonGroup) {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.addon_id === addon_id)
      if (exists) return prev.filter((a) => a.addon_id !== addon_id)
      const groupSelected = prev.filter((a) => {
        const g = product.addon_groups?.find((ag) => ag.addons?.some((ad) => ad.id === addon_id))
        return g?.id === group.id
      })
      if (groupSelected.length >= group.max_selections) return prev
      return [...prev, { addon_id, addon_name, price }]
    })
  }

  function isVariationSelected(variationId: string) {
    return selectedVariations.some((v) => v.variation_id === variationId)
  }

  function isAddonSelected(addonId: string) {
    return selectedAddons.some((a) => a.addon_id === addonId)
  }

  function validateAndAdd() {
    for (const group of product.variation_groups ?? []) {
      if (group.required) {
        const count = selectedVariations.filter((v) => v.group_id === group.id).length
        if (count < group.min_selections) {
          toast.error(`Escolha pelo menos ${group.min_selections} opção em "${group.name}"`)
          return
        }
      }
    }
    for (const group of product.addon_groups ?? []) {
      if (group.required) {
        const count = selectedAddons.filter((a) =>
          group.addons?.some((ad) => ad.id === a.addon_id)
        ).length
        if (count < group.min_selections) {
          toast.error(`Escolha pelo menos ${group.min_selections} item em "${group.name}"`)
          return
        }
      }
    }

    addItem({
      product_id: product.id,
      product_name: product.name,
      image_url: product.image_url ?? null,
      base_price: product.base_price,
      quantity,
      unit_price: unitPrice,
      notes,
      addons: selectedAddons,
      variations: selectedVariations,
    })

    if (saborGroup) {
      setShowOutroSabor(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      router.push('/carrinho')
    }
  }

  function escolherOutroSabor(variation: Variation) {
    if (!saborGroup) return
    handleVariationSelect(saborGroup, variation.id, variation.name, variation.price_modifier, variation.image_url)
    setShowOutroSabor(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-44">
      {/* Hero da imagem */}
      <div className="relative bg-white">
        {product.image_url ? (
          <div className="relative h-72 w-full">
            <Image src={product.image_url} alt={product.name} fill priority className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
            <span className="text-7xl">🍽️</span>
          </div>
        )}
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          className="absolute top-4 left-4 h-10 w-10 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </button>
      </div>

      {/* Card flutuante com nome e preço */}
      <div className="bg-white px-5 pt-2 pb-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</h1>
          {!product.is_available && (
            <span className="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 text-gray-500 rounded-full shrink-0">
              Indisponível
            </span>
          )}
        </div>
        {product.description && (
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">{product.description}</p>
        )}
        <p className="text-xl font-bold text-orange-500 mt-3">
          {formatCurrency(product.base_price)}
        </p>
      </div>

      {/* Variações */}
      {product.variation_groups?.map((group) => (
        <section key={group.id} className="mt-3 bg-white px-5 py-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-gray-900 text-base">{group.name}</h3>
            {group.required ? (
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-orange-500 text-white rounded-full">
                Obrigatório
              </span>
            ) : (
              <span className="text-[11px] text-gray-400 font-medium">Opcional</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            {group.max_selections === 1 ? 'Escolha 1 opção' : `Escolha até ${group.max_selections}`}
          </p>
          <div className="space-y-2">
            {/* Opção base do produto (só em grupos de escolha única) */}
            {group.max_selections === 1 && (() => {
              const noneSelected = !selectedVariations.some((v) => v.group_id === group.id)
              return (
                <button
                  onClick={() => setSelectedVariations((prev) => prev.filter((v) => v.group_id !== group.id))}
                  className={`w-full min-h-[56px] flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-sm transition-all active:scale-[0.99] ${
                    noneSelected ? 'border-orange-500 bg-orange-50/60' : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  {product.image_url ? (
                    <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                      <Image src={product.image_url} alt={product.name} fill sizes="48px" className="object-cover" />
                    </div>
                  ) : (
                    <div className={`h-5 w-5 shrink-0 border-2 rounded-full flex items-center justify-center ${
                      noneSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'
                    }`}>
                      {noneSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                  )}
                  <span className="flex-1 text-left min-w-0">
                    <span className="font-semibold text-gray-800 block leading-tight">{product.name}</span>
                  </span>
                  <span className="text-sm font-bold shrink-0 text-orange-500">
                    {formatCurrency(product.base_price)}
                  </span>
                </button>
              )
            })()}

            {group.variations?.map((variation) => {
              const selected = isVariationSelected(variation.id)
              return (
                <button
                  key={variation.id}
                  disabled={!variation.is_available}
                  onClick={() => handleVariationSelect(group, variation.id, variation.name, variation.price_modifier, variation.image_url)}
                  className={`w-full min-h-[56px] flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                    selected
                      ? 'border-orange-500 bg-orange-50/60'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  } ${!variation.is_available ? 'opacity-40 cursor-not-allowed' : 'active:scale-[0.99]'}`}
                >
                  {variation.image_url ? (
                    <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                      <Image src={variation.image_url} alt={variation.name} fill sizes="48px" className="object-cover" />
                    </div>
                  ) : (
                    <div className={`h-5 w-5 shrink-0 border-2 flex items-center justify-center ${
                      selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'
                    } ${group.max_selections === 1 ? 'rounded-full' : 'rounded-md'}`}>
                      {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                  )}
                  <span className="flex-1 text-left min-w-0">
                    <span className="font-semibold text-gray-800 block leading-tight">{variation.name}</span>
                    {variation.description && (
                      <span className="text-xs text-gray-400 block mt-0.5 leading-snug">{variation.description}</span>
                    )}
                  </span>
                  {group.max_selections === 1 ? (
                    <span className="text-sm font-bold shrink-0 text-orange-500">
                      {formatCurrency(product.base_price + variation.price_modifier)}
                    </span>
                  ) : (
                    variation.price_modifier !== 0 && (
                      <span className={`text-sm font-bold shrink-0 ${variation.price_modifier > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>
                        {variation.price_modifier > 0 ? '+' : ''}{formatCurrency(variation.price_modifier)}
                      </span>
                    )
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {/* Adicionais */}
      {product.addon_groups?.map((group) => (
        <section key={group.id} className="mt-3 bg-white px-5 py-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-gray-900 text-base">{group.name}</h3>
            {group.required ? (
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-orange-500 text-white rounded-full">
                Obrigatório
              </span>
            ) : (
              <span className="text-[11px] text-gray-400 font-medium">Opcional</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">Até {group.max_selections}</p>
          <div className="space-y-2">
            {group.addons?.map((addon) => {
              const selected = isAddonSelected(addon.id)
              return (
                <button
                  key={addon.id}
                  disabled={!addon.is_available}
                  onClick={() => handleAddonToggle(addon.id, addon.name, addon.price, group)}
                  className={`w-full min-h-[56px] flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                    selected
                      ? 'border-orange-500 bg-orange-50/60'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  } ${!addon.is_available ? 'opacity-40 cursor-not-allowed' : 'active:scale-[0.99]'}`}
                >
                  <div className={`h-5 w-5 rounded-md border-2 shrink-0 flex items-center justify-center ${
                    selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'
                  }`}>
                    {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="flex-1 font-semibold text-left text-gray-800">{addon.name}</span>
                  {addon.price > 0 && (
                    <span className="text-sm font-bold text-orange-500 shrink-0">
                      +{formatCurrency(addon.price)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {/* Observações */}
      <section className="mt-3 bg-white px-5 py-5">
        <h3 className="font-bold text-gray-900 text-base mb-1">Observações</h3>
        <p className="text-xs text-gray-500 mb-3">Alguma preferência? Conta pra gente.</p>
        <Textarea
          placeholder="Ex: sem cebola, ponto da carne..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="text-sm bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-orange-500/30"
        />
      </section>

      {/* Painel "Outro sabor?" */}
      {showOutroSabor && saborGroup && (
        <div className="fixed inset-0 z-50 flex items-end max-w-md mx-auto left-0 right-0">
          <div className="absolute inset-0 bg-black/40" onClick={() => router.push('/carrinho')} />
          <div className="relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" strokeWidth={3} />
              </div>
              <p className="font-bold text-gray-900 text-base">Adicionado!</p>
            </div>
            <p className="text-sm text-gray-500 mb-4">Quer adicionar outro sabor também?</p>

            <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
              {/* Opção base do produto */}
              {(() => {
                const isBase = !selectedVariations.some((sv) => sv.group_id === saborGroup.id)
                return (
                  <button
                    onClick={() => { setSelectedVariations((prev) => prev.filter((v) => v.group_id !== saborGroup.id)); setShowOutroSabor(false) }}
                    disabled={isBase}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                      isBase ? 'border-orange-200 bg-orange-50 opacity-50 cursor-not-allowed' : 'border-gray-100 hover:border-orange-300 active:scale-[0.99]'
                    }`}
                  >
                    {product.image_url ? (
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        <Image src={product.image_url} alt={product.name} fill sizes="40px" className="object-cover" />
                      </div>
                    ) : null}
                    <span className="flex-1 font-semibold text-left text-gray-800">
                      {product.name}
                      {isBase && <span className="ml-2 text-[10px] text-orange-400 font-normal">já no carrinho</span>}
                    </span>
                    <span className="text-sm font-bold text-orange-500 shrink-0">{formatCurrency(product.base_price)}</span>
                  </button>
                )
              })()}

              {saborGroup.variations?.filter((v) => v.is_available).map((variation) => {
                const isCurrent = selectedVariations.some((sv) => sv.variation_id === variation.id)
                return (
                  <button
                    key={variation.id}
                    onClick={() => escolherOutroSabor(variation)}
                    disabled={isCurrent}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                      isCurrent
                        ? 'border-orange-200 bg-orange-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-100 hover:border-orange-300 active:scale-[0.99]'
                    }`}
                  >
                    {variation.image_url ? (
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        <Image src={variation.image_url} alt={variation.name} fill sizes="40px" className="object-cover" />
                      </div>
                    ) : null}
                    <span className="flex-1 font-semibold text-left text-gray-800">
                      {variation.name}
                      {isCurrent && <span className="ml-2 text-[10px] text-orange-400 font-normal">já no carrinho</span>}
                    </span>
                    <span className="text-sm font-bold text-orange-500 shrink-0">
                      {formatCurrency(product.base_price + variation.price_modifier)}
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => router.push('/carrinho')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              Ver carrinho
            </button>
          </div>
        </div>
      )}

      {/* CTA fixo */}
      <div className={`fixed left-0 right-0 ${cartCount > 0 ? 'bottom-24' : 'bottom-0'} bg-white border-t border-gray-100 px-4 py-3 z-40 max-w-md mx-auto`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl h-12 px-1">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Diminuir"
              className="h-10 w-10 flex items-center justify-center rounded-lg active:bg-gray-200 transition-colors"
            >
              <Minus className="h-4 w-4 text-gray-700" />
            </button>
            <span className="font-bold w-6 text-center text-gray-900">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Aumentar"
              className="h-10 w-10 flex items-center justify-center rounded-lg active:bg-gray-200 transition-colors"
            >
              <Plus className="h-4 w-4 text-gray-700" />
            </button>
          </div>
          <Button
            onClick={validateAndAdd}
            disabled={!product.is_available}
            className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm shadow-md shadow-orange-500/30"
          >
            Adicionar · {formatCurrency(totalPrice)}
          </Button>
        </div>
      </div>
    </div>
  )
}
