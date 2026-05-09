'use client'

import { useCartStore } from '@/lib/store/cart'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function CartFab() {
  const { items, getTotal, getItemCount } = useCartStore()
  const pathname = usePathname()
  const count = getItemCount()

  if (count === 0) return null
  if (pathname === '/carrinho' || pathname === '/checkout') return null

  return (
    <div className="fixed bottom-4 left-0 right-0 px-4 z-50 max-w-md mx-auto pointer-events-none">
      <Link href="/carrinho" className="block pointer-events-auto">
        <div className="flex items-center justify-between bg-orange-500 text-white pl-4 pr-5 py-3.5 rounded-2xl shadow-2xl shadow-orange-500/40 active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <ShoppingBag className="h-5 w-5" strokeWidth={2.5} />
              <span className="absolute -top-1.5 -right-1.5 bg-white text-orange-500 text-[11px] rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-bold shadow-md">
                {count}
              </span>
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-medium text-white/85">Ver carrinho</p>
              <p className="text-sm font-bold">{count} {count === 1 ? 'item' : 'itens'}</p>
            </div>
          </div>
          <span className="font-bold text-base">{formatCurrency(getTotal())}</span>
        </div>
      </Link>
    </div>
  )
}
