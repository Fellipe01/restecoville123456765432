'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'
import { formatCurrency, getOrderStatusLabel, getOrderStatusColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingBag, DollarSign, TrendingUp, Clock,
  TrendingDown, Minus, ArrowRight, Package, CalendarDays,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

type Period = 'hoje' | 'semana' | 'mes' | 'custom'

interface RichItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  addons: Array<{ id: string }>
}

type OrderWithItems = Omit<Order, 'items'> & { items: RichItem[] }

interface DashboardData {
  orders: OrderWithItems[]
  prevOrders: { total: number; status: string }[]
  yearOrders: { total: number }[]
  activeOrders: OrderWithItems[]
  sessions: { session_id: string; converted: boolean }[]
}

function playNotification() {
  try {
    const ctx = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {}
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function presetRange(period: Exclude<Period, 'custom'>): { from: Date; to: Date } {
  const now = new Date()
  const to = new Date(now)
  const from = new Date(now)
  from.setHours(0, 0, 0, 0)
  if (period === 'semana') from.setDate(from.getDate() - 7)
  else if (period === 'mes') from.setDate(from.getDate() - 30)
  return { from, to }
}

function buildRanges(from: Date, to: Date) {
  const duration = to.getTime() - from.getTime()
  const compTo = new Date(from)
  const compFrom = new Date(compTo.getTime() - duration)
  const yearTo = new Date(from)
  yearTo.setFullYear(yearTo.getFullYear() - 1)
  const yearFrom = new Date(yearTo.getTime() - duration)
  return { compFrom, compTo, yearFrom, yearTo }
}

function deltaLabel(current: number, previous: number): { pct: number; up: boolean; neutral: boolean } {
  if (previous === 0) return { pct: 0, neutral: true, up: true }
  const pct = ((current - previous) / previous) * 100
  return { pct: Math.abs(pct), up: pct >= 0, neutral: Math.abs(pct) < 0.5 }
}

interface Props { restaurantId: string }

export default function DashboardClient({ restaurantId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [period, setPeriod] = useState<Period>('hoje')
  const [customFrom, setCustomFrom] = useState(todayStr())
  const [customTo, setCustomTo] = useState(todayStr())
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (from: Date, to: Date) => {
    setLoading(true)
    const { compFrom, compTo, yearFrom, yearTo } = buildRanges(from, to)

    const [
      { data: orders },
      { data: prevOrders },
      { data: yearOrders },
      { data: activeOrders },
      { data: sessions },
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('*, items:order_items(id, product_name, quantity, unit_price, total_price, addons:order_item_addons(id))')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .neq('status', 'cancelado')
        .order('created_at', { ascending: false }),

      supabase
        .from('orders')
        .select('total, status')
        .gte('created_at', compFrom.toISOString())
        .lt('created_at', compTo.toISOString())
        .neq('status', 'cancelado'),

      supabase
        .from('orders')
        .select('total')
        .gte('created_at', yearFrom.toISOString())
        .lt('created_at', yearTo.toISOString())
        .neq('status', 'cancelado'),

      supabase
        .from('orders')
        .select('*, items:order_items(id, product_name, quantity, unit_price, total_price, addons:order_item_addons(id))')
        .in('status', ['recebido', 'preparando', 'pronto', 'saindo'])
        .order('created_at', { ascending: true }),

      supabase
        .from('page_sessions')
        .select('session_id, converted')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString()),
    ])

    setData({
      orders: (orders ?? []) as OrderWithItems[],
      prevOrders: prevOrders ?? [],
      yearOrders: yearOrders ?? [],
      activeOrders: (activeOrders ?? []) as OrderWithItems[],
      sessions: sessions ?? [],
    })
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const triggerFetch = useCallback((p: Period, cfrom?: string, cto?: string) => {
    if (p === 'custom') {
      const f = new Date(cfrom ?? customFrom)
      f.setHours(0, 0, 0, 0)
      const t = new Date(cto ?? customTo)
      t.setHours(23, 59, 59, 999)
      if (!isNaN(f.getTime()) && !isNaN(t.getTime())) fetchData(f, t)
    } else {
      const { from, to } = presetRange(p)
      fetchData(from, to)
    }
  }, [customFrom, customTo, fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    triggerFetch(period)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (period !== 'custom') triggerFetch(period)
  }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        playNotification()
        triggerFetch(period)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        triggerFetch(period)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [period, triggerFetch]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived stats ───────────────────────────────────────────────────────────
  const orders = data?.orders ?? []
  const prevOrders = data?.prevOrders ?? []
  const yearOrders = data?.yearOrders ?? []
  const activeOrders = data?.activeOrders ?? []
  const sessions = data?.sessions ?? []

  const revenue = orders.reduce((s, o) => s + o.total, 0)
  const prevRevenue = prevOrders.reduce((s, o) => s + o.total, 0)
  const yearRevenue = yearOrders.reduce((s, o) => s + o.total, 0)
  const avgTicket = orders.length > 0 ? revenue / orders.length : 0
  const prevAvgTicket = prevOrders.length > 0 ? prevRevenue / prevOrders.length : 0
  const newOrders = activeOrders.filter((o) => o.status === 'recebido').length

  // Horários de pico
  const hourlyMap = new Map<number, number>()
  for (let h = 0; h < 24; h++) hourlyMap.set(h, 0)
  orders.forEach((o) => {
    const h = new Date(o.created_at).getHours()
    hourlyMap.set(h, (hourlyMap.get(h) ?? 0) + 1)
  })
  const hourlyData = Array.from(hourlyMap.entries())
    .map(([hour, count]) => ({ hour: `${String(hour).padStart(2, '0')}h`, count }))
  const maxHourCount = Math.max(...hourlyData.map((d) => d.count), 1)

  // Top produtos
  const productMap = new Map<string, { qty: number; revenue: number }>()
  orders.forEach((o) => {
    o.items?.forEach((item) => {
      const cur = productMap.get(item.product_name) ?? { qty: 0, revenue: 0 }
      productMap.set(item.product_name, { qty: cur.qty + item.quantity, revenue: cur.revenue + item.total_price })
    })
  })
  const topProducts = Array.from(productMap.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  // Upsell: % pedidos com pelo menos 1 addon
  const ordersWithAddons = orders.filter((o) => o.items?.some((i) => i.addons && i.addons.length > 0)).length
  const upsellRate = orders.length > 0 ? (ordersWithAddons / orders.length) * 100 : 0

  // Conversão
  const totalSessions = sessions.length
  const convertedSessions = sessions.filter((s) => s.converted).length
  const conversionRate = totalSessions > 0 ? (convertedSessions / totalSessions) * 100 : null

  // Comparativo anual
  const yearDelta = deltaLabel(revenue, yearRevenue)

  const PERIODS: { value: Period; label: string }[] = [
    { value: 'hoje', label: 'Hoje' },
    { value: 'semana', label: '7 dias' },
    { value: 'mes', label: '30 dias' },
    { value: 'custom', label: 'Personalizado' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  period === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.value === 'custom' && <CalendarDays className="h-3.5 w-3.5" />}
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <span className="text-gray-400 text-sm">até</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={todayStr()}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                onClick={() => triggerFetch('custom')}
                disabled={loading}
                className="h-9 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Faturamento"
          value={formatCurrency(revenue)}
          icon={<DollarSign className="h-4 w-4" />}
          delta={deltaLabel(revenue, prevRevenue)}
          loading={loading}
          accent="orange"
        />
        <KpiCard
          title="Pedidos"
          value={String(orders.length)}
          icon={<ShoppingBag className="h-4 w-4" />}
          delta={deltaLabel(orders.length, prevOrders.length)}
          loading={loading}
          accent="blue"
        />
        <KpiCard
          title="Ticket médio"
          value={formatCurrency(avgTicket)}
          icon={<TrendingUp className="h-4 w-4" />}
          delta={deltaLabel(avgTicket, prevAvgTicket)}
          loading={loading}
          accent="emerald"
        />
        <KpiCard
          title="Em aberto"
          value={String(activeOrders.length)}
          icon={<Clock className="h-4 w-4" />}
          loading={loading}
          accent="purple"
          badge={newOrders > 0 ? `${newOrders} novo${newOrders > 1 ? 's' : ''}` : undefined}
        />
      </div>

      {/* Linha 2: Horários de pico + Top produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Horários de pico */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">Horários de pico</h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  interval={2}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v) => [`${v} pedido${Number(v) !== 1 ? 's' : ''}`, '']}
                  labelFormatter={(l) => `${l}`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {hourlyData.map((entry) => (
                    <Cell
                      key={entry.hour}
                      fill={entry.count === maxHourCount && entry.count > 0 ? '#f97316' : '#fed7aa'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top produtos */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">Produtos mais vendidos</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados no período</div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, idx) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === 0 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{p.qty} un.</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full"
                        style={{ width: `${(p.qty / topProducts[0].qty) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-700 shrink-0">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linha 3: Métricas secundárias */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Upsell */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pedidos com adicionais</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mt-1" />
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900">{upsellRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-400 mt-1">{ordersWithAddons} de {orders.length} pedidos</p>
            </>
          )}
        </div>

        {/* Taxa de conversão */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Taxa de conversão</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mt-1" />
          ) : conversionRate === null ? (
            <>
              <p className="text-2xl font-bold text-gray-400">—</p>
              <p className="text-xs text-gray-400 mt-1">Aguardando dados de sessão</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900">{conversionRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-400 mt-1">{convertedSessions} de {totalSessions} visitas</p>
            </>
          )}
        </div>

        {/* Comparativo anual */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Vs. mesmo período ano anterior</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mt-1" />
          ) : yearRevenue === 0 ? (
            <>
              <p className="text-2xl font-bold text-gray-400">—</p>
              <p className="text-xs text-gray-400 mt-1">Sem dados do ano anterior</p>
            </>
          ) : (
            <>
              <p className={`text-3xl font-bold ${yearDelta.neutral ? 'text-gray-700' : yearDelta.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {yearDelta.neutral ? '=' : yearDelta.up ? '+' : '-'}{yearDelta.pct.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">Período anterior: {formatCurrency(yearRevenue)}</p>
            </>
          )}
        </div>
      </div>

      {/* Pedidos ativos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Pedidos ativos</h2>
          <Link href="/admin/pedidos" className="text-sm text-orange-500 hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Nenhum pedido ativo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeOrders.map((order) => (
              <Link key={order.id} href={`/admin/pedidos/${order.id}`}>
                <div className="bg-white rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      #{order.order_number} — {order.customer_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.type === 'delivery' ? '🛵 Delivery' : '🏪 Balcão'} · {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={getOrderStatusColor(order.status)}>{getOrderStatusLabel(order.status)}</Badge>
                    <p className="text-sm font-bold text-orange-500">{formatCurrency(order.total)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Tabela de pedidos */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Todos os pedidos —{' '}
          {period === 'custom'
            ? `${customFrom} até ${customTo}`
            : PERIODS.find((p) => p.value === period)?.label}
        </h2>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">Pedido</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Tipo</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 text-sm py-10">Nenhum pedido neste período</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/pedidos/${order.id}`)}
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">#{order.order_number}</td>
                    <td className="px-4 py-3 text-gray-700">{order.customer_name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{order.type === 'delivery' ? '🛵' : '🏪'}</td>
                    <td className="px-4 py-3">
                      <Badge className={getOrderStatusColor(order.status)}>{getOrderStatusLabel(order.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(order.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── KpiCard ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  title: string
  value: string
  icon: React.ReactNode
  loading: boolean
  delta?: { pct: number; up: boolean; neutral: boolean }
  accent: 'orange' | 'blue' | 'emerald' | 'purple'
  badge?: string
}

const ACCENT_ICON: Record<KpiCardProps['accent'], string> = {
  orange: 'bg-orange-100 text-orange-600',
  blue: 'bg-blue-100 text-blue-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  purple: 'bg-purple-100 text-purple-600',
}

function KpiCard({ title, value, icon, loading, delta, accent, badge }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${ACCENT_ICON[accent]}`}>
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-28 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        {badge && (
          <span className="text-[11px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{badge}</span>
        )}
        {delta && !loading && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${
            delta.neutral ? 'text-gray-400' : delta.up ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {delta.neutral ? <Minus className="h-3 w-3" /> : delta.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta.neutral ? 'Igual ao período anterior' : `${delta.pct.toFixed(1)}% vs período anterior`}
          </span>
        )}
      </div>
    </div>
  )
}
