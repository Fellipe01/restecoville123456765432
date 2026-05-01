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
import { ArrowLeft, Loader2, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const schema = z.object({
  customer_name: z.string().min(2, 'Nome obrigatório'),
  customer_phone: z.string().min(10, 'WhatsApp inválido'),
  order_type: z.enum(['balcao', 'delivery']),
  table_number: z.string().optional(),
  address: z.string().optional(),
  complement: z.string().optional(),
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

const STEP_LABELS = ['Seus dados', 'Pedido', 'Confirmar']

interface Props {
  restaurant: Restaurant | null
  deliveryZones: DeliveryZone[]
}

export default function CheckoutClient({ restaurant, deliveryZones }: Props) {
  const router = useRouter()
  const { items, getSubtotal, setCustomer, setDelivery, setOrderType, setTableNumber, setNotes, setPayment, clearCart } = useCartStore()
  const cartStore = useCartStore()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const mode = restaurant?.operation_mode ?? 'ambos'
  const defaultType: OrderType = mode === 'delivery' ? 'delivery' : 'balcao'

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
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
  const subtotal = getSubtotal()
  const total = subtotal + deliveryFee

  async function goToStep2() {
    const valid = await trigger(['customer_name', 'customer_phone'])
    if (valid) setStep(2)
  }

  async function goToStep3() {
    const fields: (keyof FormData)[] = ['order_type']
    if (orderType === 'delivery') fields.push('delivery_zone_id')
    const valid = await trigger(fields)
    if (orderType === 'delivery' && !deliveryZoneId) {
      toast.error('Selecione o bairro de entrega')
      return
    }
    if (orderType === 'delivery' && !watch('address')?.trim()) {
      toast.error('Informe o endereço de entrega')
      return
    }
    if (orderType === 'delivery' && selectedZone && selectedZone.minimum_order > 0 && subtotal < selectedZone.minimum_order) {
      toast.error(`Pedido mínimo para ${selectedZone.name}: ${formatCurrency(selectedZone.minimum_order)}`)
      return
    }
    if (valid) setStep(3)
  }

  async function onSubmit(data: FormData) {
    if (items.length === 0) { toast.error('Carrinho vazio'); return }

    // Junta endereço + complemento/referência em um único campo
    const fullAddress = data.complement?.trim()
      ? `${data.address?.trim()}, ${data.complement.trim()}`
      : data.address?.trim()

    setLoading(true)
    try {
      setCustomer(data.customer_name, data.customer_phone)
      if (data.order_type === 'delivery') setDelivery(data.delivery_zone_id!, deliveryFee, fullAddress ?? '')
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
          address: fullAddress,
          delivery_zone_id: data.delivery_zone_id,
          delivery_fee: deliveryFee,
          subtotal,
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

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao criar pedido')
      clearCart()
      router.push(`/confirmacao/${json.order.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao finalizar pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b">
        <button
          onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : router.back()}
          aria-label="Voltar"
          className="p-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Finalizar pedido</h1>
      </div>

      {/* Barra de progresso */}
      <div className="px-4 pt-4">
        <div className="flex gap-1.5 mb-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${s <= step ? 'bg-orange-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400">Passo {step} de 3 — {STEP_LABELS[step - 1]}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 space-y-5 pb-36">

        {/* STEP 1: Dados pessoais */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Seus dados</h2>
            <div>
              <Label>Nome</Label>
              <Input {...register('customer_name')} placeholder="Seu nome" className="mt-1" />
              {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>}
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input
                {...register('customer_phone')}
                type="tel"
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                className="mt-1"
              />
              {errors.customer_phone && <p className="text-red-500 text-xs mt-1">{errors.customer_phone.message}</p>}
            </div>
          </div>
        )}

        {/* STEP 2: Tipo + entrega + pagamento + obs */}
        {step === 2 && (
          <div className="space-y-5">
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

                {/* Bairro — select nativo para evitar bug de label com Base UI */}
                <div>
                  <Label>Bairro <span className="text-red-400">*</span></Label>
                  <select
                    {...register('delivery_zone_id')}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 cursor-pointer appearance-none"
                  >
                    <option value="">Selecione o bairro...</option>
                    {deliveryZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} — {formatCurrency(zone.fee)} (~{zone.estimated_minutes} min)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Endereço obrigatório */}
                <div>
                  <Label>Rua e número <span className="text-red-400">*</span></Label>
                  <Input
                    {...register('address')}
                    placeholder="Ex: Rua das Flores, 123"
                    className="mt-1"
                  />
                </div>

                {/* Complemento / ponto de referência */}
                <div>
                  <Label>Complemento / Ponto de referência <span className="text-gray-400 font-normal">(opcional)</span></Label>
                  <Input
                    {...register('complement')}
                    placeholder="Ex: Apto 4, próximo ao mercado vermelho..."
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <h2 className="font-semibold text-gray-800">Forma de pagamento</h2>
              <p className="text-xs text-gray-400">Você paga {orderType === 'delivery' ? 'na entrega' : 'no balcão'}</p>
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

            <div>
              <Label>Observações (opcional)</Label>
              <Textarea
                {...register('notes')}
                placeholder="Alguma observação geral..."
                rows={2}
                className="mt-1 text-sm"
              />
            </div>

            {/* Mini resumo do pedido */}
            <div className="bg-orange-50 rounded-xl p-4 space-y-2 border border-orange-100">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Resumo</p>
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-gray-600">
                  <span>{item.quantity}× {item.product_name}</span>
                  <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                </div>
              ))}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Taxa de entrega ({selectedZone?.name})</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-orange-200">
                <span>Total</span>
                <span className="text-orange-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Resumo + confirmar */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Resumo do pedido</h2>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Nome</span>
                <span className="font-medium text-gray-800">{watch('customer_name')}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>WhatsApp</span>
                <span className="font-medium text-gray-800">{watch('customer_phone')}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Tipo</span>
                <span className="font-medium text-gray-800">{orderType === 'delivery' ? '🛵 Delivery' : '🏪 Balcão'}</span>
              </div>
              {orderType === 'delivery' && selectedZone && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Bairro</span>
                    <span className="font-medium text-gray-800">{selectedZone.name}</span>
                  </div>
                  {watch('address') && (
                    <div className="flex justify-between text-gray-500">
                      <span>Endereço</span>
                      <span className="font-medium text-gray-800 text-right max-w-[60%]">
                        {watch('address')}{watch('complement') ? `, ${watch('complement')}` : ''}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Pagamento</span>
                <span className="font-medium text-gray-800">
                  {PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.label}
                  {paymentMethod === 'dinheiro' && watch('troco') ? ` · troco p/ R$ ${watch('troco')}` : ''}
                </span>
              </div>
            </div>

            <Separator />

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-gray-600">
                  <span>{item.quantity}× {item.product_name}</span>
                  <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Taxa de entrega</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-orange-500">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* CTA sticky */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-4 max-w-2xl mx-auto">
        {step === 1 && (
          <Button
            type="button"
            onClick={goToStep2}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-base"
          >
            Continuar <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        )}
        {step === 2 && (
          <Button
            type="button"
            onClick={goToStep3}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-base"
          >
            Revisar pedido <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        )}
        {step === 3 && (
          <Button
            type="submit"
            disabled={loading}
            onClick={handleSubmit(onSubmit)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-base"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Fazer pedido · ${formatCurrency(total)}`}
          </Button>
        )}
      </div>
    </div>
  )
}
