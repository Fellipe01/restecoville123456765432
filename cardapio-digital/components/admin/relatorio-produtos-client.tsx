'use client'

import { formatCurrency } from '@/lib/utils'
import { Star, Package, TrendingUp } from 'lucide-react'

interface ProductStat {
  name: string
  qty: number
  revenue: number
}

interface Props {
  products: ProductStat[]
  totalRatings: number
  avgRating: number | null
}

export default function RelatorioProdutosClient({ products, totalRatings, avgRating }: Props) {
  const totalQty = products.reduce((s, p) => s + p.qty, 0)
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0)
  const maxQty = products[0]?.qty ?? 1

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatório de Produtos</h1>
        <p className="text-sm text-gray-400 mt-1">Últimos 30 dias · pedidos não cancelados</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-orange-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Itens vendidos</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalQty}</p>
          <p className="text-xs text-gray-400 mt-1">{products.length} produtos distintos</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Receita (produtos)</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">Sem taxa de entrega</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avaliação média</p>
          </div>
          {avgRating === null ? (
            <>
              <p className="text-3xl font-bold text-gray-400">—</p>
              <p className="text-xs text-gray-400 mt-1">Sem avaliações ainda</p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
                <span className="text-lg text-yellow-500">★</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{totalRatings} avaliação{totalRatings !== 1 ? 'ões' : ''}</p>
            </>
          )}
        </div>
      </div>

      {/* Ranking de produtos */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-5">Ranking de produtos</h2>

        {products.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">Nenhum pedido nos últimos 30 dias.</p>
        ) : (
          <div className="space-y-4">
            {products.map((p, idx) => {
              const pct = (p.qty / maxQty) * 100
              const share = totalQty > 0 ? (p.qty / totalQty) * 100 : 0
              return (
                <div key={p.name} className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-orange-500 text-white' :
                      idx === 1 ? 'bg-gray-700 text-white' :
                      idx === 2 ? 'bg-amber-600 text-white' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-800 truncate">{p.name}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-gray-400">{p.qty} un. ({share.toFixed(1)}%)</span>
                          <span className="text-sm font-bold text-gray-700">{formatCurrency(p.revenue)}</span>
                        </div>
                      </div>
                      <div className="mt-1.5 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${idx === 0 ? 'bg-orange-500' : 'bg-orange-300'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
