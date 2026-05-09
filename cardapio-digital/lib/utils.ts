import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Aplica máscara progressiva enquanto o usuário digita
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export function buildWhatsAppMessage(orderNumber: number, items: Array<{ name: string; qty: number; price: number }>, total: number): string {
  const itemsText = items.map((i) => `- ${i.qty}x ${i.name}: R$ ${i.price.toFixed(2)}`).join('\n')
  return encodeURIComponent(
    `*Pedido #${orderNumber}* confirmado!\n\n${itemsText}\n\n*Total: R$ ${total.toFixed(2)}*\n\nAcompanhe seu pedido pelo link.`
  )
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    recebido: 'Recebido',
    preparando: 'Preparando',
    pronto: 'Pronto',
    saindo: 'Saindo',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
  }
  return labels[status] ?? status
}

export function getPaymentLabel(method: string): string {
  const labels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    debito: 'Débito',
    credito: 'Crédito',
  }
  return labels[method] ?? method
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function calcDeliveryFee(
  distKm: number,
  baseRadiusKm: number,
  baseFee: number,
  extraFeePerKm: number
): number {
  if (distKm <= baseRadiusKm) return baseFee
  return baseFee + (distKm - baseRadiusKm) * extraFeePerKm
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    recebido: 'bg-blue-100 text-blue-800',
    preparando: 'bg-yellow-100 text-yellow-800',
    pronto: 'bg-green-100 text-green-800',
    saindo: 'bg-purple-100 text-purple-800',
    entregue: 'bg-gray-100 text-gray-600',
    cancelado: 'bg-red-100 text-red-800',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}
