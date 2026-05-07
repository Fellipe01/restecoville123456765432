'use client'

import { useEffect, useState, useCallback } from 'react'
import { useDelivererStore } from '@/lib/store/deliverer'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Order, Deliverer } from '@/types'
import { DeliveryGroup } from '@/lib/grouping'
import { formatCurrency, getPaymentLabel } from '@/lib/utils'
import { MapPin, Phone, MessageCircle, CheckCircle2, LogOut, Bike, Package, ArrowRightLeft, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function buildMapsUrl(address: string, city: string, lat?: number | null, lng?: number | null) {
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  const query = city ? `${address}, ${city}` : address
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`
}

export default function EntregadorClient({ city }: { city: string }) {
  const router = useRouter()
  const { session, token, _hydrated, clearSession } = useDelivererStore()
  const [tab, setTab] = useState<'disponiveis' | 'em_rota'>('disponiveis')
  const [groups, setGroups] = useState<DeliveryGroup[]>([])
  const [myOrders, setMyOrders] = useState<Order[]>([])
  const [claiming, setClaiming] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [transferModal, setTransferModal] = useState<Order | null>(null)
  const [deliverers, setDeliverers] = useState<Deliverer[]>([])
  const [transferring, setTransferring] = useState(false)
  const supabase = createClient()

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  }

  const fetchGroups = useCallback(async () => {
    const res = await fetch('/api/entregador/grupos', { headers: authHeaders() })
    const json = await res.json()
    if (res.ok) setGroups(json.groups ?? [])
  }, [token])

  const fetchMyOrders = useCallback(async () => {
    if (!token) return
    const res = await fetch('/api/entregador/meus-pedidos', { headers: authHeaders() })
    const json = await res.json()
    if (res.ok) setMyOrders(json.orders ?? [])
  }, [token])

  useEffect(() => {
    if (!_hydrated) return
    if (!session) { router.replace('/entregador/login'); return }
    // Sessão antiga (pré-JWT) não tem token — força novo login
    if (!token) { clearSession(); router.replace('/entregador/login'); return }

    fetchGroups()
    fetchMyOrders()

    const poll = setInterval(() => { fetchGroups(); fetchMyOrders() }, 30_000)

    const channel = supabase
      .channel('entregador-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchGroups()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchGroups()
        fetchMyOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [session, token, _hydrated])

  async function claimGroup(group: DeliveryGroup) {
    if (!session) return
    setClaiming(group.id)
    try {
      const res = await fetch('/api/entregador/grupos', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ order_ids: group.orders.map((o) => o.id) }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erro ao pegar grupo')
        fetchGroups()
      } else {
        toast.success(`${group.totalOrders} pedido${group.totalOrders > 1 ? 's' : ''} reservado${group.totalOrders > 1 ? 's' : ''} para você!`)
        fetchGroups()
        fetchMyOrders()
        setTab('em_rota')
      }
    } catch {
      toast.error('Erro de conexão. Tente novamente.')
    } finally {
      setClaiming(null)
    }
  }

  async function confirmarEntrega(order: Order) {
    setConfirming(order.id)
    setMyOrders((prev) => prev.filter((o) => o.id !== order.id))
    try {
      const res = await fetch('/api/entregador/confirmar', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ order_id: order.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error)
        setMyOrders((prev) => [order, ...prev].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
      } else {
        toast.success(`Pedido #${order.order_number} entregue! ✅`)
      }
    } catch {
      toast.error('Erro ao confirmar. Tente novamente.')
      setMyOrders((prev) => [order, ...prev])
    } finally {
      setConfirming(null)
    }
  }

  async function openTransfer(order: Order) {
    setTransferModal(order)
    const { data } = await supabase
      .from('deliverers')
      .select('id, name, phone, is_active, restaurant_id')
      .eq('is_active', true)
      .neq('id', session!.id)
    setDeliverers((data ?? []) as Deliverer[])
  }

  async function transferOrder(toDeliverer: Deliverer) {
    if (!transferModal || !session) return
    setTransferring(true)
    try {
      const res = await fetch('/api/entregador/transferir', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          order_id: transferModal.id,
          to_deliverer_id: toDeliverer.id,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erro ao transferir')
      } else {
        toast.success(`Pedido #${transferModal.order_number} transferido para ${toDeliverer.name}`)
        setMyOrders((prev) => prev.filter((o) => o.id !== transferModal.id))
        setTransferModal(null)
      }
    } catch {
      toast.error('Erro de conexão.')
    } finally {
      setTransferring(false)
    }
  }

  function sair() { clearSession(); router.replace('/entregador/login') }

  if (!_hydrated || !session) return null

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <Bike className="h-5 w-5 text-orange-500" />
          <div>
            <p className="font-bold text-sm">{session.name}</p>
            <p className="text-xs text-gray-400">{myOrders.length} em rota · {groups.reduce((a, g) => a + g.totalOrders, 0)} disponíveis</p>
          </div>
        </div>
        <button onClick={sair} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 shrink-0">
        {(['disponiveis', 'em_rota'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'
            }`}
          >
            {t === 'disponiveis' ? `📦 Disponíveis (${groups.length})` : `🛵 Em rota (${myOrders.length})`}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-xl mx-auto w-full">

        {/* ── DISPONÍVEIS ── */}
        {tab === 'disponiveis' && (
          <>
            {groups.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-5xl mb-4">📦</p>
                <p className="text-gray-300 font-semibold">Nenhum grupo disponível</p>
                <p className="text-gray-500 text-sm mt-1">Os pedidos prontos aparecem aqui agrupados por proximidade</p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="bg-gray-900 rounded-2xl p-4 space-y-3 border border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-500" />
                      <span className="font-bold text-white">
                        {group.totalOrders} pedido{group.totalOrders > 1 ? 's' : ''}
                      </span>
                      {group.totalOrders > 1 && (
                        <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                          rota otimizada
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-orange-500">{formatCurrency(group.totalValue)}</span>
                  </div>

                  <div className="space-y-2">
                    {group.orders.map((order, idx) => (
                      <div key={order.id} className="flex items-start gap-3 bg-gray-800 rounded-xl px-3 py-2.5">
                        <span className="text-xs font-bold text-orange-400 mt-0.5 w-4 shrink-0">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-white">#{order.order_number} · {order.customer_name}</p>
                            <span className="text-xs text-gray-400 ml-2">{formatCurrency(order.total)}</span>
                          </div>
                          {order.address && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              <MapPin className="h-3 w-3 inline mr-0.5" />{order.address}
                            </p>
                          )}
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {order.payment_method === 'dinheiro' ? '💵' : '💳'} {getPaymentLabel(order.payment_method ?? 'dinheiro')}
                            </span>
                            {order.troco && (
                              <span className="text-xs text-gray-500">· troco p/ {formatCurrency(Number(order.troco))}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => claimGroup(group)}
                    disabled={claiming === group.id}
                    className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl"
                  >
                    {claiming === group.id ? 'Reservando...' : `Pegar ${group.totalOrders > 1 ? 'grupo' : 'pedido'}`}
                  </Button>
                </div>
              ))
            )}
          </>
        )}

        {/* ── EM ROTA ── */}
        {tab === 'em_rota' && (
          <>
            {myOrders.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-5xl mb-4">🛵</p>
                <p className="text-gray-300 font-semibold">Nenhuma entrega em rota</p>
                <p className="text-gray-500 text-sm mt-1">Pegue um grupo na aba Disponíveis</p>
              </div>
            ) : (
              myOrders.map((order) => (
                <div key={order.id} className="bg-gray-900 rounded-2xl p-4 space-y-3 border border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-white">#{order.order_number}</span>
                    <span className="text-xs bg-orange-500/20 text-orange-400 font-semibold px-2 py-1 rounded-full">🛵 Saindo</span>
                  </div>

                  <div>
                    <p className="font-semibold text-white">{order.customer_name}</p>
                    {order.address && (
                      <div className="flex items-start gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-300">{order.address}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {order.payment_method === 'dinheiro' ? '💵' : '💳'} {getPaymentLabel(order.payment_method ?? 'dinheiro')}
                      {order.troco ? ` · troco p/ ${formatCurrency(Number(order.troco))}` : ''}
                    </span>
                    <span className="font-bold text-orange-500">{formatCurrency(order.total)}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {order.address && (
                      <a
                        href={buildMapsUrl(order.address, city, order.latitude, order.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl py-3 text-xs font-semibold transition-colors"
                      >
                        <Navigation className="h-5 w-5" />
                        Maps
                      </a>
                    )}
                    <a
                      href={`https://wa.me/${order.customer_phone?.replace(/\D/g, '').replace(/^(?!55)/, '55')}?text=${encodeURIComponent(`Olá ${order.customer_name.split(' ')[0]}! Sou o entregador do seu pedido #${order.order_number}. Já estou a caminho! 🛵`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl py-3 text-xs font-semibold transition-colors"
                    >
                      <MessageCircle className="h-5 w-5" />
                      WhatsApp
                    </a>
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="flex flex-col items-center gap-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl py-3 text-xs font-semibold transition-colors"
                    >
                      <Phone className="h-5 w-5" />
                      Ligar
                    </a>
                  </div>

                  <Button
                    onClick={() => confirmarEntrega(order)}
                    disabled={confirming === order.id}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 text-base rounded-xl"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Confirmar entrega
                  </Button>

                  <button
                    onClick={() => openTransfer(order)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Transferir para outro entregador
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Modal de transferência */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-50" onClick={() => setTransferModal(null)}>
          <div className="bg-gray-900 rounded-t-3xl w-full max-w-xl mx-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg">Transferir pedido #{transferModal.order_number}</h2>
            <p className="text-sm text-gray-400">Selecione o entregador que vai assumir esta entrega:</p>

            {deliverers.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Nenhum outro entregador ativo no momento</p>
            ) : (
              <div className="space-y-2">
                {deliverers.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => transferOrder(d)}
                    disabled={transferring}
                    className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-3 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Bike className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">{d.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{d.phone ?? ''}</span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setTransferModal(null)}
              className="w-full py-3 rounded-xl border border-gray-700 text-gray-400 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
