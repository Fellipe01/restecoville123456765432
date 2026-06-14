import type { BusinessHours } from '@/types'

export function computeIsOpen(hours: BusinessHours[]): boolean | null {
  if (!hours.length) return null

  const now = new Date()
  let dayOfWeek = now.getUTCDay()
  let currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() - 3 * 60
  if (currentMinutes < 0) { currentMinutes += 24 * 60; dayOfWeek = (dayOfWeek - 1 + 7) % 7 }

  const today = hours.find((h) => h.day_of_week === dayOfWeek)
  if (!today || today.is_closed) return false

  const [openH, openM] = today.open_time.split(':').map(Number)
  const [closeH, closeM] = today.close_time.split(':').map(Number)
  return currentMinutes >= openH * 60 + openM && currentMinutes <= closeH * 60 + closeM
}
