'use client'

import { useState, useMemo } from 'react'
import { Restaurant, Category, Product } from '@/types'
import { Input } from '@/components/ui/input'
import ProductCard from './product-card'
import RestaurantHeader from './restaurant-header'
import { Search, Package, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Props {
  restaurant: Restaurant | null
  categories: Category[]
  products: Product[]
  activeOrdersCount: number
}

export default function HomeClient({ restaurant, categories, products, activeOrdersCount }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = products
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      )
    }
    if (activeCategory) {
      result = result.filter((p) => p.category_id === activeCategory)
    }
    return result
  }, [products, search, activeCategory])

  const grouped = useMemo(() => {
    if (activeCategory || search.trim()) {
      return [{ category: null, items: filtered }]
    }
    return categories.map((cat) => ({
      category: cat,
      items: products.filter((p) => p.category_id === cat.id),
    })).filter((g) => g.items.length > 0)
  }, [categories, filtered, activeCategory, search])

  return (
    <div className="max-w-md mx-auto pb-28 bg-gray-50 min-h-screen">
      <RestaurantHeader restaurant={restaurant} activeOrdersCount={activeOrdersCount} />

      {/* Banner acompanhar pedido */}
      <Link
        href="/acompanhar"
        className="mx-4 mt-3 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-sm active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Package className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Acompanhar pedido</p>
            <p className="text-[11px] text-white/85">Veja o status em tempo real</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-white/80" />
      </Link>

      {/* Sticky search + chips */}
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-md px-4 pt-4 pb-3 mt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar no cardápio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-11 bg-white border-gray-200 rounded-xl shadow-sm focus-visible:ring-orange-500/30"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-4 h-9 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                activeCategory === null
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`shrink-0 flex items-center gap-2 pl-1.5 pr-4 h-9 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {cat.image_url ? (
                  <span className="relative h-7 w-7 rounded-full overflow-hidden bg-gray-100 shrink-0">
                    <Image src={cat.image_url} alt={cat.name} fill sizes="28px" className="object-cover" />
                  </span>
                ) : (
                  <span className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center text-sm shrink-0">
                    🍽️
                  </span>
                )}
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 space-y-7 mt-3">
        {grouped.map((group, idx) => (
          <section key={idx}>
            {group.category && (
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base font-bold text-gray-900">{group.category.name}</h2>
                <span className="text-[11px] text-gray-400 font-medium">
                  {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
            )}
            {group.items.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">Nenhum item encontrado</p>
            ) : (
              <div className="space-y-3">
                {group.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        ))}

        {filtered.length === 0 && search && (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🔎</p>
            <p className="font-semibold text-gray-700">Nada encontrado</p>
            <p className="text-sm text-gray-400 mt-1">Tente buscar com outras palavras</p>
          </div>
        )}
      </div>
    </div>
  )
}
