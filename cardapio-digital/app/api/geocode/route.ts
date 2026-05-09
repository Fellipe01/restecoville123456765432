import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimitAsync } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown'
  const rateCheck = await checkRateLimitAsync(ip, { namespace: 'geocode', maxRequests: 15, windowMs: 60_000 })
  if (!rateCheck.ok) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em instantes.' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
    )
  }
  const { searchParams } = new URL(request.url)
  const latRaw = searchParams.get('lat')
  const lngRaw = searchParams.get('lng')

  if (!latRaw || !lngRaw) {
    return NextResponse.json({ error: 'lat e lng são obrigatórios' }, { status: 400 })
  }

  const lat = parseFloat(latRaw)
  const lng = parseFloat(lngRaw)

  if (
    isNaN(lat) || isNaN(lng) ||
    lat < -90 || lat > 90 ||
    lng < -180 || lng > 180
  ) {
    return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 })
  }

  // Usa valores já validados — sem interpolação de strings do usuário
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'cardapio-digital/1.0 (app de delivery)' },
  })
  const data = await res.json()

  const addr = data.address ?? {}
  const road = addr.road ?? addr.pedestrian ?? addr.path ?? addr.suburb ?? ''
  const houseNumber = addr.house_number ? `, ${addr.house_number}` : ''
  const address = `${road}${houseNumber}`.trim()

  return NextResponse.json({
    address,
    district: addr.suburb ?? addr.neighbourhood ?? addr.city_district ?? '',
    full: data.display_name ?? '',
  })
}
