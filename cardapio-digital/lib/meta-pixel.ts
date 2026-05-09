declare global {
  interface Window {
    fbq: (...args: unknown[]) => void
    _fbq: unknown
  }
}

export function trackMetaPurchase(
  orderId: string,
  total: number,
  items: { name: string; quantity: number }[]
) {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', 'Purchase', {
    value: total,
    currency: 'BRL',
    order_id: orderId,
    contents: items.map((i) => ({ id: i.name, quantity: i.quantity })),
    content_type: 'product',
  })
}

export function trackMetaInitiateCheckout(total: number) {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', 'InitiateCheckout', { value: total, currency: 'BRL' })
}

export function trackMetaViewContent(productName: string, price: number) {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', 'ViewContent', {
    content_name: productName,
    value: price,
    currency: 'BRL',
    content_type: 'product',
  })
}
