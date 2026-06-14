'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export default function PushRegistrar() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)

    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    }).catch(() => {})
  }, [])

  async function toggle() {
    if (loading || !supported) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/admin/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setSubscribed(false)
        toast.success('Notificações desativadas')
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          toast.error('Permissão negada. Habilite notificações nas configurações do navegador.')
          return
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        })
        await fetch('/api/admin/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })
        setSubscribed(true)
        toast.success('Notificações ativadas! Você vai receber alertas mesmo com a aba fechada.')
      }
    } catch (e) {
      toast.error('Erro ao configurar notificações')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={subscribed ? 'Desativar notificações push' : 'Ativar notificações push'}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors font-medium ${
        subscribed
          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      } disabled:opacity-50`}
    >
      {subscribed ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
      {subscribed ? 'Push ativo' : 'Ativar push'}
    </button>
  )
}
