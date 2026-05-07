'use client'

import { Product } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const card = (
    <div className={`flex gap-3 bg-white rounded-xl p-3 shadow-sm transition-shadow ${product.is_available ? 'hover:shadow-md cursor-pointer' : 'opacity-60 cursor-default'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{product.name}</h3>
          {!product.is_available && (
            <Badge variant="secondary" className="text-xs shrink-0">Indisponível</Badge>
          )}
        </div>
        {product.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        )}
        <p className="mt-2 font-bold text-sm text-orange-700">
          {formatCurrency(product.base_price)}
        </p>
      </div>

      {product.image_url && (
        <div className="relative h-24 w-24 rounded-lg overflow-hidden shrink-0">
          <Image src={product.image_url} alt={product.name} fill sizes="96px" className="object-cover" />
        </div>
      )}
    </div>
  )

  if (!product.is_available) return card

  return <Link href={`/item/${product.id}`}>{card}</Link>
}
