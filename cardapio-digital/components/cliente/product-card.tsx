'use client'

import { Product } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Plus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const card = (
    <div
      className={`group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 transition-all ${
        product.is_available
          ? 'active:scale-[0.98] hover:shadow-md cursor-pointer'
          : 'opacity-60 cursor-default'
      }`}
    >
      <div className="flex gap-3 p-3">
        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
          <div>
            <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2">
              {product.name}
            </h3>
            {product.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <p className="font-bold text-base text-orange-500">
              {formatCurrency(product.base_price)}
            </p>
            {product.type === 'combo' && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 rounded-full">
                Combo
              </span>
            )}
            {!product.is_available && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 rounded-full">
                Indisponível
              </span>
            )}
          </div>
        </div>

        {product.image_url ? (
          <div className="relative h-28 w-28 rounded-xl overflow-hidden shrink-0 bg-gray-100">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="112px"
              className="object-cover"
            />
            {product.is_available && (
              <div className="absolute bottom-1.5 right-1.5 h-7 w-7 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md">
                <Plus className="h-4 w-4" strokeWidth={3} />
              </div>
            )}
          </div>
        ) : (
          <div className="relative h-28 w-28 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
            <span className="text-3xl">🍽️</span>
            {product.is_available && (
              <div className="absolute bottom-1.5 right-1.5 h-7 w-7 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md">
                <Plus className="h-4 w-4" strokeWidth={3} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (!product.is_available) return card

  return <Link href={`/item/${product.id}`}>{card}</Link>
}
