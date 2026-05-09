'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, LocateFixed } from 'lucide-react'
import { toast } from 'sonner'
import 'leaflet/dist/leaflet.css'

const GURUPI: [number, number] = [-11.7342, -49.0864]

interface Props {
  onLocationSelect: (lat: number, lng: number, address: string) => void
  initialCoords?: { lat: number; lng: number } | null
}

export default function MapPicker({ onLocationSelect, initialCoords }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [locating, setLocating] = useState(false)
  const [selected, setSelected] = useState(false)

  const geocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true)
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
      const data = await res.json()
      onLocationSelect(lat, lng, data.address ?? '')
      setSelected(true)
    } finally {
      setGeocoding(false)
    }
  }, [onLocationSelect])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const center = initialCoords
      ? ([initialCoords.lat, initialCoords.lng] as [number, number])
      : GURUPI
    const zoom = initialCoords ? 17 : 14

    import('leaflet').then((mod) => {
      const L = mod.default

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, { center, zoom, zoomControl: true })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      const pinIcon = L.divIcon({
        html: `<div style="
          width:32px;height:32px;
          background:#f97316;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
        "></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        className: '',
      })

      const marker = L.marker(center, { draggable: true, icon: pinIcon }).addTo(map)

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng()
        geocode(lat, lng)
      })

      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng)
        geocode(e.latlng.lat, e.latlng.lng)
      })

      mapRef.current = map
      markerRef.current = marker

      if (initialCoords) setSelected(true)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [])

  async function useMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      )
      const { latitude: lat, longitude: lng } = pos.coords
      if (markerRef.current && mapRef.current) {
        markerRef.current.setLatLng([lat, lng])
        mapRef.current.setView([lat, lng], 17)
        await geocode(lat, lng)
      }
    } catch (err: any) {
      if (err?.code === 1) {
        toast.error('Permissão de localização negada. Marque o ponto no mapa manualmente.')
      } else {
        toast.error('Não foi possível obter sua localização. Marque no mapa.')
      }
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full rounded-xl overflow-hidden border-2 border-gray-200"
          style={{ height: 260 }}
        />
        {geocoding && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 shadow-md z-[1000]">
            <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
            Identificando endereço...
          </div>
        )}
        {!selected && !geocoding && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[999]">
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-gray-600 shadow">
              Toque no mapa para marcar o local de entrega
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50"
      >
        {locating
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <LocateFixed className="h-4 w-4" />
        }
        {locating ? 'Obtendo localização...' : 'Usar minha localização'}
      </button>
    </div>
  )
}
