'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const SESSION_KEY = 'ecoville_session_id'

export function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export default function SessionTracker({ restaurantId }: { restaurantId: string }) {
  useEffect(() => {
    const sessionId = getOrCreateSessionId()
    if (typeof window !== 'undefined') window.__sessionId = sessionId

    const supabase = createClient()
    supabase
      .from('page_sessions')
      .upsert({ session_id: sessionId, restaurant_id: restaurantId }, { onConflict: 'session_id' })
      .then(() => {})
  }, [restaurantId])

  return null
}
