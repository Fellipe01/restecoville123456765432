'use client'

import { useState } from 'react'
import { Product, VariationGroup, AddonGroup, CartItemVariation, CartItemAddon } from '@/types'
import { useCartStore, calculateItemPrice } from '@/lib/store/cart'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  product: Product
}

export default function ItemClient({ product }: Props) {
  const router = useRouter()
  const { addItem } = useCartStore()

  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [selectedVariations, setSelectedVariations] = useState<CartItemVariation[]>([])
  const [selectedAddons, setSelectedAddons] = useState<CartItemAddon[]>([])

  const unitPrice = calculateItemPrice(product.base_price, selectedVariations, selectedAddons)
  const totalPrice = unitPrice * quantity

  function handleVariationSelect(group: VariationGroup, variationId: string, variationName: string, priceModifier: number) {
    setSelectedVariations((prev) => {
      const others = prev.filter((v) => v.group_id !== group.id)
      if (group.max_selections === 1) {
        return [...others, { variation_id: variationId, variation_name: variationName, group_name: group.name, group_id: group.id, price_modifier: priceModifier }]
      }
      const exists = prev.find((v) => v.variation_id === variationId)
      if (exists) return prev.filter((v) => v.variation_id !== variationId)
      const groupSelected = prev.filter((v) => v.group_id === group.id)
      if (groupSelected.length >= group.max_selections) return prev
      return [...prev, { variation_id: variationId, variation_name: variationName, group_name: group.name, group_id: group.id, price_modifier: priceModifier }]
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

    toast.success(`${product.name} adicionado ao carrinho`)
    router.back()
  }

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen">
      <div className="relative">
        {product.image_url ? (
          <div className="relative h-56 w-full">
            <Image src={product.image_url} alt={product.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="h-32 bg-gray-100" />
        )}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 bg-white rounded-full p-2 shadow"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
            {!product.is_available && <Badge variant="secondary">Indisponível</Badge>}
          </div>
          {product.description && (
            <p className="text-gray-500 mt-1 text-sm">{product.description}</p>
          )}
          <p className="text-lg font-bold text-orange-500 mt-2">
            {formatCurrency(product.base_price)}
          </p>
        </div>

        {product.variation_groups?.map((group) => (
          <div key={group.id}>
            <Separator />
            <div className="py-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{group.name}</h3>
                <div className="flex gap-1">
                  {group.required && <Badge variant="destructive" className="text-xs">Obrigatório</Badge>}
                  <Badge variant="outline" className="text-xs">
                    {group.max_selections === 1 ? 'Escolha 1' : `Até ${group.max_selections}`}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                {group.variations?.map((variation) => (
                  <button
                    key={variation.id}
                    disabled={!variation.is_available}
                    onClick={() => handleVariationSelect(group, variation.id, variation.name, variation.price_modifier)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      isVariationSelected(variation.id)
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!variation.is_available ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className="font-medium">{variation.name}</span>
                    <span className="text-gray-600">
                      {variation.price_modifier > 0 ? `+${formatCurrency(variation.price_modifier)}` : ''}
                      {variation.price_modifier < 0 ? formatCurrency(variation.price_modifier) : ''}
                      {variation.price_modifier === 0 ? '' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {product.addon_groups?.map((group) => (
          <div key={group.id}>
            <Separator />
            <div className="py-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{group.name}</h3>
                <div className="flex gap-1">
                  {group.required && <Badge variant="destructive" className="text-xs">Obrigatório</Badge>}
                  <Badge variant="outline" className="text-xs">Até {group.max_selections}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                {group.addons?.map((addon) => (
                  <button
                    key={addon.id}
                    disabled={!addon.is_available}
                    onClick={() => handleAddonToggle(addon.id, addon.name, addon.price, group)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      isAddonSelected(addon.id)
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!addon.is_available ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className="font-medium">{addon.name}</span>
                    {addon.price > 0 && <span className="text-gray-600">+{formatCurrency(addon.price)}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        <Separator />
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Observações</h3>
          <Textarea
            placeholder="Ex: sem cebola, ponto da carne..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="text-sm"
          />
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t px-4 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border rounded-lg px-3 py-2">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-bold w-5 text-center">{quantity}</span>
            <button onClick={() => setQuantity((q) => q + 1)}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            onClick={validateAndAdd}
            disabled={!product.is_available}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold"
          >
            Adicionar · {formatCurrency(totalPrice)}
          </Button>
        </div>
      </div>
    </div>
  )
}
