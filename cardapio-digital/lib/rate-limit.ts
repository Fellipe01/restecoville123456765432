const store = new Map<string, number[]>()

const WINDOW_MS = 60_000 // 1 minuto
const MAX_REQUESTS = 8   // máx 8 pedidos por minuto por IP

export function checkRateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  const timestamps = (store.get(ip) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000)
    return { ok: false, retryAfter }
  }

  timestamps.push(now)
  store.set(ip, timestamps)

  if (store.size > 5000) {
    for (const [key, times] of store.entries()) {
      if (times.every((t) => t <= windowStart)) store.delete(key)
    }
  }

  return { ok: true }
}
