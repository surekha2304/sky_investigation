import { useEffect, useState } from 'react'
import { Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import { useInvestigationStore } from '../../store/useInvestigationStore'
import type { DroneWaypoint } from '../../types'

function AnimatedPath({ waypoints, color, label }: {
  waypoints: DroneWaypoint[]
  color: string
  label: string
}) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    setVisibleCount(0)
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisibleCount(i)
      if (i >= waypoints.length) clearInterval(interval)
    }, 600)
    return () => clearInterval(interval)
  }, [waypoints])

  const visibleWaypoints = waypoints.slice(0, visibleCount)
  const positions = visibleWaypoints.map(w => w.coordinates)

  return (
    <>
      {positions.length > 1 && (
        <Polyline
          positions={positions}
          pathOptions={{ color, weight: 2, opacity: 0.8, dashArray: '6 4' }}
        />
      )}
      {visibleWaypoints.map((wp, i) => (
        <CircleMarker
          key={`${label}-${i}`}
          center={wp.coordinates}
          radius={i === 0 || i === visibleWaypoints.length - 1 ? 6 : 4}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: i === visibleWaypoints.length - 1 ? 1 : 0.4,
            weight: 1.5,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11 }}>
              <strong>{label}</strong><br />
              {new Date(wp.timestamp).toLocaleTimeString()}<br />
              {wp.observation && <span style={{ color: '#999' }}>{wp.observation}</span>}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  )
}

export default function DronePathLayer() {
  const { dronePatrol, followupPatrol, investigationState } = useInvestigationStore()

  if (investigationState === 'idle') return null

  return (
    <>
      {dronePatrol && (
        <AnimatedPath
          waypoints={dronePatrol.waypoints}
          color="#f97316"
          label="Patrol Alpha"
        />
      )}
      {followupPatrol && (
        <AnimatedPath
          waypoints={followupPatrol.waypoints}
          color="#58a6ff"
          label="Follow-up Drone"
        />
      )}
    </>
  )
}
