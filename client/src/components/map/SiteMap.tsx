import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useInvestigationStore } from '../../store/useInvestigationStore'
import type { SiteEvent, Classification } from '../../types'
import DronePathLayer from './DronePathLayer'

const classificationColors: Record<Classification, string> = {
  harmless: '#3fb950',
  monitor: '#d29922',
  escalate: '#f85149',
  unreviewed: '#30363d',
}

const eventTypeIcons: Record<string, string> = {
  fence_alert: '⚡',
  vehicle_path: '🚗',
  badge_swipe_failed: '🔒',
  drone_patrol: '🚁',
  motion_sensor: '👁',
  camera_fault: '📷',
  weather: '🌬',
}

const zoneTypeColors: Record<string, string> = {
  gate: '#f97316',
  block: '#58a6ff',
  storage: '#f85149',
  access_point: '#bc8cff',
  drone_base: '#3fb950',
}

const zoneTypeLabels: Record<string, string> = {
  gate: 'GATE',
  block: 'BLOCK',
  storage: 'YARD',
  access_point: 'ACCESS',
  drone_base: 'DRONE BASE',
}

function createEventIcon(event: SiteEvent, classification: Classification, selected: boolean) {
  const color = classificationColors[classification]
  const emoji = eventTypeIcons[event.type] || '●'
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:${color}33;border:2px solid ${color};
      display:flex;align-items:center;justify-content:center;
      font-size:15px;cursor:pointer;
      box-shadow: 0 0 0 ${selected ? '4px' : '0px'} ${color}55, 0 0 12px ${color}44;
      transition: box-shadow 0.2s;
    ">${emoji}</div>`,
  })
}

function createZoneLabelIcon(name: string, typeLabel: string, typeColor: string) {
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
      user-select: none;
    ">
      <div style="
        font-family: 'JetBrains Mono', monospace;
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 0.15em;
        color: ${typeColor}99;
        text-transform: uppercase;
        margin-bottom: 2px;
      ">${typeLabel}</div>
      <div style="
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        font-weight: 600;
        color: ${typeColor}dd;
        white-space: nowrap;
      ">${name}</div>
    </div>`,
  })
}

function ZonePolygons() {
  const { zones, classifications, overrides, events } = useInvestigationStore()

  const getStatusColor = (zoneId: string) => {
    const zoneEvents = events.filter(e => e.zone === zoneId)
    if (zoneEvents.length === 0) return null
    const statuses = zoneEvents.map(e => {
      const ov = overrides[e.id]
      return ov?.override_classification || classifications[e.id]?.classification || 'unreviewed'
    })
    if (statuses.includes('escalate')) return '#f85149'
    if (statuses.includes('monitor')) return '#d29922'
    if (statuses.every(c => c === 'harmless')) return '#3fb950'
    return null
  }

  return (
    <>
      {zones.map(zone => {
        const typeColor = zoneTypeColors[zone.type] || '#6e7681'
        const statusColor = getStatusColor(zone.id)
        const fillColor = statusColor || typeColor
        const isDashed = zone.restrictionLevel === 'restricted'

        return (
          <Polygon
            key={zone.id}
            positions={zone.coordinates}
            pathOptions={{
              color: typeColor,
              fillColor: fillColor,
              fillOpacity: statusColor ? 0.35 : 0.18,
              weight: isDashed ? 2.5 : 2,
              dashArray: isDashed ? '8 4' : undefined,
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 170, background: '#161b22', color: '#e6edf3', padding: '8px 10px', borderRadius: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{zone.name}</div>
                <div style={{ fontSize: 11, color: typeColor, marginBottom: 6, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                  {zoneTypeLabels[zone.type]} · {zone.restrictionLevel.toUpperCase()}
                </div>
                <div style={{ fontSize: 11, color: '#6e7681' }}>
                  {events.filter(e => e.zone === zone.id).length} overnight event(s)
                </div>
              </div>
            </Popup>
          </Polygon>
        )
      })}

      {/* Zone labels rendered as permanent markers at zone centers */}
      {zones.map(zone => {
        const typeColor = zoneTypeColors[zone.type] || '#6e7681'
        const typeLabel = zoneTypeLabels[zone.type] || zone.type.toUpperCase()
        return (
          <Marker
            key={`label-${zone.id}`}
            position={zone.center}
            icon={createZoneLabelIcon(zone.name, typeLabel, typeColor)}
            interactive={false}
          />
        )
      })}
    </>
  )
}

function EventMarkers() {
  const { events, classifications, overrides, selectedEventId, setSelectedEvent } = useInvestigationStore()

  return (
    <>
      {events.map(event => {
        const override = overrides[event.id]
        const classification = override?.override_classification
          || classifications[event.id]?.classification
          || 'unreviewed'
        const selected = selectedEventId === event.id
        const conf = classifications[event.id]

        return (
          <Marker
            key={event.id}
            position={event.coordinates}
            icon={createEventIcon(event, classification, selected)}
            eventHandlers={{ click: () => setSelectedEvent(selected ? null : event.id) }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 210, maxWidth: 270, background: '#161b22', color: '#e6edf3', padding: '10px 12px', borderRadius: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{event.title}</div>
                <div style={{ fontSize: 11, color: '#6e7681', marginBottom: 8, fontFamily: 'monospace' }}>
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {event.zone}
                </div>
                <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 8, lineHeight: 1.5 }}>{event.description}</div>
                {conf && (
                  <div style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 4, display: 'inline-block',
                    background: classificationColors[classification] + '22',
                    color: classificationColors[classification],
                    border: `1px solid ${classificationColors[classification]}55`,
                    fontFamily: 'monospace', letterSpacing: '0.05em',
                  }}>
                    {classification.toUpperCase()} · {Math.round(conf.confidence * 100)}%
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}

function MapController() {
  const map = useMap()
  const { selectedEventId, events } = useInvestigationStore()
  const prevSelected = useRef<string | null>(null)

  useEffect(() => {
    if (selectedEventId && selectedEventId !== prevSelected.current) {
      const event = events.find(e => e.id === selectedEventId)
      if (event) map.setView(event.coordinates, 17, { animate: true })
    }
    prevSelected.current = selectedEventId
  }, [selectedEventId, events, map])

  return null
}

// Legend overlay
function MapLegend() {
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
      background: 'rgba(13,17,23,0.92)', border: '1px solid #21262d',
      borderRadius: 6, padding: '8px 10px', backdropFilter: 'blur(4px)',
    }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#6e7681', letterSpacing: '0.15em', marginBottom: 6 }}>
        ZONE STATUS
      </div>
      {[
        { color: '#f85149', label: 'Escalate' },
        { color: '#d29922', label: 'Monitor' },
        { color: '#3fb950', label: 'Harmless' },
        { color: '#30363d', label: 'Unreviewed' },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: color + '44', border: `1px solid ${color}` }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#8b949e' }}>{label}</span>
        </div>
      ))}
      <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#6e7681', letterSpacing: '0.15em', marginTop: 6, marginBottom: 4 }}>
        ZONE TYPE
      </div>
      {Object.entries(zoneTypeColors).map(([type, color]) => (
        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 10, height: 2, background: color }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#8b949e' }}>
            {zoneTypeLabels[type]}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function SiteMap() {
  const CENTER: [number, number] = [51.505, -0.089]

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={CENTER}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />
        <ZonePolygons />
        <EventMarkers />
        <DronePathLayer />
        <MapController />
      </MapContainer>
      <MapLegend />
    </div>
  )
}
