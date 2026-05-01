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
