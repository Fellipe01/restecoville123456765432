import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── In-memory fallback (dev / sem Upstash configurado) ──────────────────────
const memStore = new Map<string, number[]>()

function checkMemory(
  ip: string,
  { windowMs = 60_000, maxRequests = 8, namespace = 'default' }: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs
  const key = `${namespace}:${ip}`
  const timestamps = (memStore.get(key) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= maxRequests) {
    const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000)
    return { ok: false, retryAfter }
  }

  timestamps.push(now)
  memStore.set(key, timestamps)

  if (memStore.size > 5000) {
    for (const [k, times] of memStore.entries()) {
      if (times.every((t) => t <= windowStart)) memStore.delete(k)
    }
  }

  return { ok: true }
}

// ── Upstash Redis (produção) ────────────────────────────────────────────────
// Cache de limiters por namespace para não criar instâncias repetidas
const limiters = new Map<string, Ratelimit>()

function getLimiter(namespace: string, maxRequests: number, windowMs: number): Ratelimit {
  const key = `${namespace}:${maxRequests}:${windowMs}`
  if (!limiters.has(key)) {
    const redis = Redis.fromEnv()
    limiters.set(key, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${Math.round(windowMs / 1000)} s`),
      prefix: `rl:${namespace}`,
    }))
  }
  return limiters.get(key)!
}

// ── API pública ─────────────────────────────────────────────────────────────
interface RateLimitOptions {
  windowMs?: number
  maxRequests?: number
  namespace?: string
}

interface RateLimitResult {
  ok: boolean
  retryAfter?: number
}

const useUpstash =
  typeof process !== 'undefined' &&
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN

export function checkRateLimit(
  ip: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  if (!useUpstash) return checkMemory(ip, options)
  // Upstash é async — chame checkRateLimitAsync em vez disso quando disponível
  return checkMemory(ip, options)
}

export async function checkRateLimitAsync(
  ip: string,
  { windowMs = 60_000, maxRequests = 8, namespace = 'default' }: RateLimitOptions = {}
): Promise<RateLimitResult> {
  if (!useUpstash) return checkMemory(ip, { windowMs, maxRequests, namespace })

  const limiter = getLimiter(namespace, maxRequests, windowMs)
  const { success, reset } = await limiter.limit(`${namespace}:${ip}`)
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    return { ok: false, retryAfter }
  }
  return { ok: true }
}
