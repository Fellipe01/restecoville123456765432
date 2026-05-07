import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat e lng são obrigatórios' }, { status: 400 })
  }

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
