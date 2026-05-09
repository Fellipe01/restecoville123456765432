export const GA_ID = 'G-BNYG5MH4K6'

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    dataLayer: unknown[]
    __sessionId?: string
  }
}

export function trackPurchase(
  orderId: string,
  total: number,
  items: { name: string; price: number; quantity: number }[]
) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', 'purchase', {
    transaction_id: orderId,
    value: total,
    currency: 'BRL',
    items: items.map((item, idx) => ({
      item_id: String(idx),
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  })
}

export function trackBeginCheckout(total: number) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', 'begin_checkout', { value: total, currency: 'BRL' })
}
