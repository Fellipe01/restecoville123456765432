'use client'

import { useState, useMemo } from 'react'
import { Restaurant, Category, Product } from '@/types'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import ProductCard from './product-card'
import RestaurantHeader from './restaurant-header'
import { Search } from 'lucide-react'

interface Props {
  restaurant: Restaurant | null
  categories: Category[]
  products: Product[]
}

export default function HomeClient({ restaurant, categories, products }: Props) {
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
    <div className="max-w-2xl mx-auto pb-24">
      <RestaurantHeader restaurant={restaurant} />

      <div className="sticky top-0 z-10 bg-gray-50 px-4 pt-3 pb-2 space-y-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar no cardápio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Badge
              variant={activeCategory === null ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setActiveCategory(null)}
            >
              Todos
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant={activeCategory === cat.id ? 'default' : 'outline'}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              >
                {cat.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 space-y-8 mt-4">
        {grouped.map((group, idx) => (
          <section key={idx}>
            {group.category && (
              <h2 className="text-lg font-bold mb-3 text-gray-800">{group.category.name}</h2>
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
          <p className="text-center text-gray-400 py-16">Nenhum resultado para "{search}"</p>
        )}
      </div>
    </div>
  )
}
