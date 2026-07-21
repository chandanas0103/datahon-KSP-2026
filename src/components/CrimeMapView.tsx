'use client'

import { useEffect, useRef } from 'react'

interface MapDataPoint {
  area: string
  lat: number
  lng: number
  total: number
  breakdown: Record<string, number>
}

const CRIME_COLORS: Record<string, string> = {
  'Theft': '#f59e0b',
  'Burglary': '#ef4444',
  'Robbery': '#dc2626',
  'Assault': '#f97316',
  'Cheating': '#8b5cf6',
  'Cyber Crime': '#3b82f6',
  'Vehicle Theft': '#eab308',
  'Chain Snatching': '#ec4899',
  'Murder': '#991b1b',
  'Rape': '#9f1239',
  'Kidnapping': '#7c2d12',
  'Fraud': '#6d28d9',
  'Vandalism': '#65a30d',
  'Domestic Violence': '#0891b2',
  'Drug Offense': '#059669',
}

export default function CrimeMapView({ data, onClose }: { data: MapDataPoint[]; onClose: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || data.length === 0) return

    // Dynamically import leaflet to avoid SSR issues
    let map: L.Map
    let cleanup = false

    import('leaflet').then((L) => {
      if (cleanup || !mapRef.current) return

      // Fix leaflet default icon issue
      delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([12.95, 77.60], 11)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 16,
      }).addTo(map)

      // Find max for scaling
      const maxTotal = Math.max(...data.map(d => d.total))

      data.forEach((point) => {
        const topCrime = Object.entries(point.breakdown).sort((a, b) => b[1] - a[1])[0]
        const color = topCrime ? (CRIME_COLORS[topCrime[0]] || '#3b82f6') : '#3b82f6'
        const radius = Math.max(8, (point.total / maxTotal) * 35)

        const circle = L.circleMarker([point.lat, point.lng], {
          radius,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.4,
        }).addTo(map)

        // Build popup content
        const sortedBreakdown = Object.entries(point.breakdown).sort((a, b) => b[1] - a[1]).slice(0, 6)
        const breakdownHtml = sortedBreakdown.map(([crime, count]) =>
          `<div style="display:flex;justify-content:space-between;gap:12px;margin:2px 0;font-size:11px;">
            <span>${crime}</span><strong>${count}</strong>
          </div>`
        ).join('')

        circle.bindPopup(`
          <div style="min-width:180px;font-family:system-ui;">
            <div style="font-size:14px;font-weight:700;margin-bottom:6px;color:#1a237e;">${point.area}</div>
            <div style="font-size:12px;color:#666;margin-bottom:8px;">Total: <strong style="color:#1a237e;">${point.total}</strong> cases</div>
            <div style="border-top:1px solid #eee;padding-top:6px;">${breakdownHtml}</div>
          </div>
        `)
      })

      mapInstance.current = map
    })

    // Add leaflet CSS dynamically
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    return () => {
      cleanup = true
      document.head.removeChild(link)
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [data])

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1001] bg-background/95 backdrop-blur border-b px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">Crime Heatmap</h3>
            <p className="text-[10px] text-muted-foreground">Bangalore Urban District</p>
          </div>
        </div>
        <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors flex items-center gap-1.5">
          Back to Chat
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-14 right-3 z-[1001] bg-card/95 backdrop-blur border border-border/50 rounded-lg p-2.5 max-h-[60vh] overflow-y-auto" style={{ fontSize: '10px' }}>
        <p className="font-semibold text-muted-foreground mb-1.5">Crime Types</p>
        {Object.entries(CRIME_COLORS).map(([crime, color]) => (
          <div key={crime} className="flex items-center gap-1.5 py-0.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">{crime}</span>
          </div>
        ))}
      </div>

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full pt-12" style={{ background: '#1a1a2e' }} />
    </div>
  )
}