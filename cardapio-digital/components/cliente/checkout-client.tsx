'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCartStore } from '@/lib/store/cart'
import { formatCurrency } from '@/lib/utils'
import { Restaurant, DeliveryZone, OrderType, PaymentMethod } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const schema = z.object({
  customer_name: z.string().min(2, 'Nome obrigatório'),
  customer_phone: z.string().min(10, 'Telefone inválido'),
  order_type: z.enum(['balcao', 'delivery']),
  table_number: z.string().optional(),
  address: z.string().optional(),
  delivery_zone_id: z.string().optional(),
  notes: z.string().optional(),
  payment_method: z.enum(['dinheiro', 'debito', 'credito']),
  troco: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { value: 'debito', label: 'Débito', icon: '💳' },
  { value: 'credito', label: 'Crédito', icon: '💳' },
]

interface Props {
  restaurant: Restaurant | null
  deliveryZones: DeliveryZone[]
}

export default function CheckoutClient({ restaurant, deliveryZones }: Props) {
  const router = useRouter()
  const { items, getSubtotal, setCustomer, setDelivery, setOrderType, setTableNumber, setNotes, setPayment, clearCart } = useCartStore()
  const cartStore = useCartStore()
  const [loading, setLoading] = useState(false)

  const mode = restaurant?.operation_mode ?? 'ambos'
  const defaultType: OrderType = mode === 'delivery' ? 'delivery' : 'balcao'

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_name: cartStore.customer_name,
      customer_phone: cartStore.customer_phone,
      order_type: defaultType,
      payment_method: cartStore.payment_method,
      troco: cartStore.troco,
    },
  })

  const orderType = watch('order_type')
  const paymentMethod = watch('payment_method')
  const deliveryZoneId = watch('delivery_zone_id')
  const selectedZone = deliveryZones.find((z) => z.id === deliveryZoneId)
  const deliveryFee = selectedZone?.fee ?? 0
  const total = getSubtotal() + deliveryFee

  async function onSubmit(data: FormData) {
    if (items.length === 0) {
      toast.error('Carrinho vazio')
      return
    }
    if (data.order_type === 'delivery' && !data.delivery_zone_id) {
      toast.error('Selecione o bairro de entrega')
      return
    }

    setLoading(true)
    try {
      setCustomer(data.customer_name, data.customer_phone)
      if (data.order_type === 'delivery') {
        setDelivery(data.delivery_zone_id!, deliveryFee, data.address ?? '')
      }
      setOrderType(data.order_type)
      setTableNumber(data.table_number ?? '')
      setNotes(data.notes ?? '')
      setPayment(data.payment_method, data.troco ?? '')

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          type: data.order_type,
          table_number: data.table_number,
          address: data.address,
          delivery_zone_id: data.delivery_zone_id,
          delivery_fee: deliveryFee,
          subtotal: getSubtotal(),
          total,
          notes: data.notes,
          payment_method: data.payment_method,
          troco: data.payment_method === 'dinheiro' && data.troco ? parseFloat(data.troco) : null,
          items: items.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.unit_price * item.quantity,
            notes: item.notes,
            addons: item.addons,
            variations: item.variations,
          })),
        }),
      })

      if (!res.ok) throw new Error('Erro ao criar pedido')
      const { order } = await res.json()
      clearCart()
      router.push(`/confirmacao/${order.id}`)
    } catch {
      toast.error('Erro ao finalizar pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen">
      <div className="flex items-center gap-3 px-4 py-4 border-b">
        <button onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Finalizar pedido</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 space-y-5 pb-32">
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Seus dados</h2>
          <div>
            <Label>Nome</Label>
            <Input {...register('customer_name')} placeholder="Seu nome" className="mt-1" />
            {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>}
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input {...register('customer_phone')} type="tel" inputMode="numeric" placeholder="(11) 99999-9999" className="mt-1" />
            {errors.customer_phone && <p className="text-red-500 text-xs mt-1">{errors.customer_phone.message}</p>}
          </div>
        </div>

        <Separator />

        {mode === 'ambos' && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-800">Tipo de pedido</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['balcao', 'delivery'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue('order_type', type)}
                  className={`py-3 rounded-xl border-2 font-medium text-sm transition-colors ${
                    orderType === type ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {type === 'balcao' ? '🏪 Retirar no balcão' : '🛵 Delivery'}
                </button>
              ))}
            </div>
          </div>
        )}

        {orderType === 'balcao' && (
          <div>
            <Label>Número da mesa (opcional)</Label>
            <Input {...register('table_number')} placeholder="Mesa 5..." className="mt-1" />
          </div>
        )}

        {orderType === 'delivery' && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-800">Entrega</h2>
            <div>
              <Label>Bairro</Label>
              <select
                {...register('delivery_zone_id')}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecione o bairro...</option>
                {deliveryZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} — {formatCurrency(zone.fee)} (~{zone.estimated_minutes} min)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Endereço completo</Label>
              <Input {...register('address')} placeholder="Rua, número, complemento..." className="mt-1" />
            </div>
          </div>
        )}

        <Separator />

        <div>
          <Label>Observações do pedido (opcional)</Label>
          <Textarea
            {...register('notes')}
            placeholder="Alguma observação geral..."
            rows={2}
            className="mt-1 text-sm"
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Forma de pagamento</h2>
          <p className="text-xs text-gray-400">Pagamento {orderType === 'delivery' ? 'na entrega' : 'no balcão'}</p>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_OPTIONS.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('payment_method', value)}
                className={`py-3 rounded-xl border-2 font-medium text-sm transition-colors flex flex-col items-center gap-1 ${
                  paymentMethod === value
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                <span className="text-lg">{icon}</span>
                {label}
              </button>
            ))}
          </div>
          {paymentMethod === 'dinheiro' && (
            <div>
              <Label>Troco para (opcional)</Label>
              <Input
                {...register('troco')}
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 50.00"
                className="mt-1"
              />
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2 bg-gray-50 rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Resumo</h2>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm text-gray-600">
              <span>{item.quantity}x {item.product_name}</span>
              <span>{formatCurrency(item.unit_price * item.quantity)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatCurrency(getSubtotal())}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Taxa de entrega</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-orange-500">{formatCurrency(total)}</span>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Pagamento na retirada / entrega</p>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-base"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Fazer pedido · ${formatCurrency(total)}`}
        </Button>
      </form>
    </div>
  )
}
