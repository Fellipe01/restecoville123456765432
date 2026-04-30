'use client'

import { useCartStore } from '@/lib/store/cart'
import { formatCurrency } from '@/lib/utils'
import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function CartFab() {
  const { items, getTotal, getItemCount } = useCartStore()
  const pathname = usePathname()
  const count = getItemCount()

  if (count === 0) return null
  if (pathname === '/carrinho' || pathname === '/checkout') return null

  return (
    <div className="fixed bottom-6 left-0 right-0 px-4 z-50 max-w-2xl mx-auto">
      <Link href="/carrinho">
        <div className="flex items-center justify-between bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {count}
              </span>
            </div>
            <span className="font-medium text-sm">Ver carrinho</span>
          </div>
          <span className="font-bold">{formatCurrency(getTotal())}</span>
        </div>
      </Link>
    </div>
  )
}
