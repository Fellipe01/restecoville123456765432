import { Order } from '@/types'

const RADIUS_KM = 2
const MAX_PER_GROUP = 3
const RESTAURANT_LAT = -11.7278604
const RESTAURANT_LNG = -49.0277786

export interface DeliveryGroup {
  id: string
  orders: Order[]
  totalValue: number
  totalOrders: number
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearestNeighborSort(orders: Order[], startLat: number, startLng: number): Order[] {
  const remaining = [...orders]
  const result: Order[] = []
  let curLat = startLat
  let curLng = startLng

  while (remaining.length > 0) {
    let nearestIdx = 0
    let nearestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const o = remaining[i]
      if (!o.latitude || !o.longitude) { nearestIdx = i; break }
      const d = haversineKm(curLat, curLng, o.latitude, o.longitude)
      if (d < nearestDist) { nearestDist = d; nearestIdx = i }
    }
    const next = remaining.splice(nearestIdx, 1)[0]
    result.push(next)
    curLat = next.latitude ?? curLat
    curLng = next.longitude ?? curLng
  }
  return result
}

export function buildDeliveryGroups(
  orders: Order[],
  restaurantLat = RESTAURANT_LAT,
  restaurantLng = RESTAURANT_LNG,
): DeliveryGroup[] {
  const used = new Set<string>()
  const groups: DeliveryGroup[] = []

  const withCoords = orders.filter((o) => o.latitude && o.longitude)
  const withoutCoords = orders.filter((o) => !o.latitude || !o.longitude)

  for (const anchor of withCoords) {
    if (used.has(anchor.id)) continue
    const group: Order[] = [anchor]
    used.add(anchor.id)

    for (const other of withCoords) {
      if (used.has(other.id) || group.length >= MAX_PER_GROUP) continue
      const dist = haversineKm(anchor.latitude!, anchor.longitude!, other.latitude!, other.longitude!)
      if (dist <= RADIUS_KM) {
        group.push(other)
        used.add(other.id)
      }
    }

    const sorted = nearestNeighborSort(group, restaurantLat, restaurantLng)
    groups.push({
      id: crypto.randomUUID(),
      orders: sorted,
      totalValue: sorted.reduce((acc, o) => acc + Number(o.total), 0),
      totalOrders: sorted.length,
    })
  }

  for (const order of withoutCoords) {
    groups.push({
      id: crypto.randomUUID(),
      orders: [order],
      totalValue: Number(order.total),
      totalOrders: 1,
    })
  }

  return groups
}
