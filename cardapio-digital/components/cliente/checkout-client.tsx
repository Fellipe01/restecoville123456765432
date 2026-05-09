'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCartStore } from '@/lib/store/cart'
import { formatCurrency, maskPhone } from '@/lib/utils'
import { Restaurant, DeliveryZone, OrderType, PaymentMethod } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, ChevronRight, MapPin, Store, Bike, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const MapPicker = dynamic(() => import('@/components/cliente/map-picker'), { ssr: false })

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
}).superRefine((data, ctx) => {
  if (data.payment_method === 'dinheiro' && !data.troco?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o valor para o troco', path: ['troco'] })
  }
})

type FormData = z.infer<typeof schema>

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { value: 'debito',   label: 'Débito',   icon: '💳' },
  { value: 'credito',  label: 'Crédito',  icon: '💳' },
]

const STEP_LABELS = ['Entrega', 'Pagamento', 'Confirmar']

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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

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

  function handleLocationSelect(lat: number, lng: number, address: string) {
    setCoords({ lat, lng })
    if (address) setValue('address', address)
  }

  async function goToStep2() {
    const valid = await trigger(['customer_name', 'customer_phone'])
    if (!valid) return

    if (orderType === 'delivery') {
      if (!coords) { toast.error('Marque o local de entrega no mapa'); return }
      if (!deliveryZoneId) { toast.error('Selecione o bairro de entrega'); return }
      if (selectedZone && selectedZone.minimum_order > 0 && subtotal < selectedZone.minimum_order) {
        toast.error(`Pedido mínimo para ${selectedZone.name}: ${formatCurrency(selectedZone.minimum_order)}`); return
      }
    }

    window.scrollTo(0, 0)
    setStep(2)
  }

  async function goToStep3() {
    if (paymentMethod === 'dinheiro') {
      if (!watch('troco')?.trim()) { toast.error('Informe o valor para o troco'); return }
      const trocoVal = parseFloat(watch('troco') ?? '0')
      if (trocoVal < total) { toast.error(`Troco deve ser maior ou igual ao total (${formatCurrency(total)})`); return }
    }
    window.scrollTo(0, 0)
    setStep(3)
  }

  function goBack() {
    if (step === 1) { router.back(); return }
    window.scrollTo(0, 0)
    setStep((s) => (s - 1) as 1 | 2 | 3)
  }

  async function onSubmit(data: FormData) {
    if (items.length === 0) { toast.error('Carrinho vazio'); return }

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
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
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
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={goBack}
            aria-label="Voltar"
            className="h-10 w-10 -ml-2 flex items-center justify-center rounded-full active:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold leading-tight text-gray-900">Finalizar pedido</h1>
            <p className="text-[11px] text-gray-400">Etapa {step} de 3 · {STEP_LABELS[step - 1]}</p>
          </div>
        </div>

        {/* Stepper visual */}
        <div className="flex items-center gap-2 px-4 pb-3">
          {STEP_LABELS.map((label, idx) => {
            const s = idx + 1
            const done = s < step
            const active = s === step
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                      done
                        ? 'bg-orange-500 text-white'
                        : active
                        ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s}
                  </div>
                  <span
                    className={`mt-1 text-[10px] font-semibold ${
                      active ? 'text-orange-600' : done ? 'text-gray-700' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {s < 3 && (
                  <div className={`h-0.5 flex-1 -mt-4 mx-1 rounded-full ${done ? 'bg-orange-500' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 space-y-4">

        {/* ── STEP 1: Dados + Entrega ── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Card de dados */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <h2 className="font-bold text-gray-900 text-sm">Seus dados</h2>
              <div>
                <Label className="text-xs text-gray-600 font-medium">Nome</Label>
                <Input
                  {...register('customer_name')}
                  placeholder="Seu nome"
                  className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus-visible:ring-orange-500/30"
                />
                {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>}
              </div>
              <div>
                <Label className="text-xs text-gray-600 font-medium">WhatsApp</Label>
                <Input
                  {...register('customer_phone')}
                  type="tel"
                  inputMode="numeric"
                  placeholder="(11) 99999-9999"
                  className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus-visible:ring-orange-500/30"
                  onChange={(e) => setValue('customer_phone', maskPhone(e.target.value), { shouldValidate: true })}
                />
                {errors.customer_phone && <p className="text-red-500 text-xs mt-1">{errors.customer_phone.message}</p>}
              </div>
            </div>

            {/* Tipo de pedido */}
            {mode === 'ambos' && (
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <h2 className="font-bold text-gray-900 text-sm">Como você quer receber?</h2>
                <div className="grid grid-cols-2 gap-3">
                  {(['balcao', 'delivery'] as const).map((type) => {
                    const selected = orderType === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setValue('order_type', type)}
                        className={`min-h-[80px] py-3 px-3 rounded-xl border-2 text-sm transition-all flex flex-col items-center gap-1.5 ${
                          selected
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-100 bg-white text-gray-600'
                        }`}
                      >
                        {type === 'balcao' ? (
                          <Store className={`h-6 w-6 ${selected ? 'text-orange-500' : 'text-gray-400'}`} />
                        ) : (
                          <Bike className={`h-6 w-6 ${selected ? 'text-orange-500' : 'text-gray-400'}`} />
                        )}
                        <span className="font-bold">{type === 'balcao' ? 'Retirar' : 'Delivery'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {orderType === 'balcao' && (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <Label className="text-xs text-gray-600 font-medium">Número da mesa <span className="text-gray-400">(opcional)</span></Label>
                <Input
                  {...register('table_number')}
                  placeholder="Ex: Mesa 5"
                  className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus-visible:ring-orange-500/30"
                />
              </div>
            )}

            {orderType === 'delivery' && (
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  <h2 className="font-bold text-gray-900 text-sm">Local de entrega</h2>
                </div>
                <p className="text-xs text-gray-500 -mt-2">Toque no mapa para marcar o ponto exato</p>
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <MapPicker onLocationSelect={handleLocationSelect} initialCoords={coords} />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 font-medium">
                    Endereço <span className="text-gray-400 font-normal">(preenchido pelo mapa)</span>
                  </Label>
                  <Input
                    {...register('address')}
                    placeholder="Toque no mapa para preencher..."
                    className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus-visible:ring-orange-500/30"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 font-medium">Complemento <span className="text-gray-400 font-normal">(opcional)</span></Label>
                  <Input
                    {...register('complement')}
                    placeholder="Ex: Apto 4, próximo ao mercado..."
                    className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus-visible:ring-orange-500/30"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 font-medium">Bairro <span className="text-orange-500">*</span></Label>
                  <select
                    {...register('delivery_zone_id')}
                    className="mt-1.5 w-full h-11 border border-gray-200 rounded-xl px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 cursor-pointer appearance-none"
                  >
                    <option value="">Selecione o bairro...</option>
                    {deliveryZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} — {formatCurrency(zone.fee)} (~{zone.estimated_minutes} min)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Pagamento ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Resumo</p>
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-gray-600">
                  <span className="truncate pr-2">{item.quantity}× {item.product_name}</span>
                  <span className="font-medium shrink-0">{formatCurrency(item.unit_price * item.quantity)}</span>
                </div>
              ))}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-xs text-gray-500 pt-1">
                  <span>Taxa de entrega ({selectedZone?.name})</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                <span className="text-gray-900">Total</span>
                <span className="text-orange-500">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Pagamento */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Forma de pagamento</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Você paga {orderType === 'delivery' ? 'na entrega' : 'no balcão'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map(({ value, label, icon }) => {
                  const selected = paymentMethod === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setValue('payment_method', value)}
                      className={`min-h-[88px] py-3 rounded-xl border-2 text-xs transition-all flex flex-col items-center gap-1.5 ${
                        selected
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-100 bg-white text-gray-600'
                      }`}
                    >
                      <span className="text-2xl">{icon}</span>
                      <span className="font-bold">{label}</span>
                    </button>
                  )
                })}
              </div>

              {paymentMethod === 'dinheiro' && (
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                  <Label className="text-xs text-gray-700 font-semibold">Troco para <span className="text-orange-500">*</span></Label>
                  <Input
                    {...register('troco')}
                    type="number"
                    step="1"
                    min={Math.ceil(total)}
                    placeholder={`Mín. R$ ${Math.ceil(total)}`}
                    className="mt-1.5 h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-orange-500/30"
                  />
                  <p className="text-[11px] text-gray-500 mt-1.5">Total do pedido: {formatCurrency(total)}</p>
                  {errors.troco && <p className="text-red-500 text-xs mt-1">{errors.troco.message}</p>}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4">
              <Label className="text-xs text-gray-600 font-medium">Observações <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <Textarea
                {...register('notes')}
                placeholder="Alguma observação geral..."
                rows={3}
                className="mt-1.5 text-sm rounded-xl border-gray-200 bg-gray-50 focus-visible:ring-orange-500/30"
              />
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirmar ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h2 className="font-bold text-gray-900 text-sm mb-3">Dados do pedido</h2>
              <div className="space-y-2 text-sm divide-y divide-gray-100">
                <div className="flex justify-between pb-2">
                  <span className="text-gray-500">Nome</span>
                  <span className="font-semibold text-gray-900">{watch('customer_name')}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">WhatsApp</span>
                  <span className="font-semibold text-gray-900">{watch('customer_phone')}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Tipo</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    {orderType === 'delivery' ? <><Bike className="h-3.5 w-3.5" /> Delivery</> : <><Store className="h-3.5 w-3.5" /> Balcão</>}
                  </span>
                </div>
                {orderType === 'delivery' && (
                  <>
                    {selectedZone && (
                      <div className="flex justify-between py-2">
                        <span className="text-gray-500">Bairro</span>
                        <span className="font-semibold text-gray-900">{selectedZone.name}</span>
                      </div>
                    )}
                    {watch('address') && (
                      <div className="flex justify-between gap-3 py-2">
                        <span className="text-gray-500 shrink-0">Endereço</span>
                        <span className="font-semibold text-gray-900 text-right">
                          {watch('address')}{watch('complement') ? `, ${watch('complement')}` : ''}
                        </span>
                      </div>
                    )}
                    {coords && (
                      <div className="flex justify-between py-2">
                        <span className="text-gray-500">Localização</span>
                        <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Pin salvo
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between pt-2">
                  <span className="text-gray-500">Pagamento</span>
                  <span className="font-semibold text-gray-900 text-right">
                    {PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.label}
                    {paymentMethod === 'dinheiro' && watch('troco') ? ` · troco p/ R$ ${watch('troco')}` : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              <h2 className="font-bold text-gray-900 text-sm mb-2">Itens</h2>
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-gray-600">
                  <span className="truncate pr-2">{item.quantity}× {item.product_name}</span>
                  <span className="font-medium shrink-0">{formatCurrency(item.unit_price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Taxa de entrega</span>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span className="text-orange-500">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {watch('notes') && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-wider font-bold text-amber-700 mb-1">Observações</p>
                <p className="text-sm text-gray-700">{watch('notes')}</p>
              </div>
            )}
          </div>
        )}
      </form>

      {/* CTA sticky */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 max-w-md mx-auto">
        {step === 1 && (
          <Button
            type="button"
            onClick={goToStep2}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm shadow-md shadow-orange-500/30"
          >
            Continuar <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        )}
        {step === 2 && (
          <Button
            type="button"
            onClick={goToStep3}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm shadow-md shadow-orange-500/30"
          >
            Revisar pedido <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        )}
        {step === 3 && (
          <Button
            type="submit"
            disabled={loading}
            onClick={handleSubmit(onSubmit)}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm shadow-md shadow-orange-500/30"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Fazer pedido · ${formatCurrency(total)}`}
          </Button>
        )}
      </div>
    </div>
  )
}
