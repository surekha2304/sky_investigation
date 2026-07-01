import { useInvestigationStore } from '../../store/useInvestigationStore'
import type { Classification } from '../../types'
import clsx from 'clsx'

const classificationBg: Record<Classification, string> = {
  harmless: 'text-ops-green bg-ops-green/10 border-ops-green/30',
  monitor: 'text-ops-yellow bg-ops-yellow/10 border-ops-yellow/30',
  escalate: 'text-ops-red bg-ops-red/10 border-ops-red/30',
  unreviewed: 'text-ops-muted bg-ops-muted/10 border-ops-muted/30',
}

const eventTypeLabel: Record<string, string> = {
  fence_alert: 'FENCE',
  vehicle_path: 'VEHICLE',
  badge_swipe_failed: 'BADGE',
  drone_patrol: 'DRONE',
  motion_sensor: 'MOTION',
  camera_fault: 'CAMERA',
  weather: 'WEATHER',
}

const eventTypeColor: Record<string, string> = {
  fence_alert: 'text-ops-yellow',
  vehicle_path: 'text-ops-accent',
  badge_swipe_failed: 'text-ops-red',
  drone_patrol: 'text-ops-green',
  motion_sensor: 'text-ops-accent',
  camera_fault: 'text-ops-muted',
  weather: 'text-blue-400',
}

export default function EventTimeline() {
  const { events, classifications, overrides, approvals, selectedEventId, setSelectedEvent } = useInvestigationStore()

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-3 py-2 border-b border-ops-border sticky top-0 bg-ops-panel z-10">
        <span className="text-[10px] font-mono text-ops-muted tracking-widest uppercase">
          Overnight Events · {events.length} total
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {events.map(event => {
          const override = overrides[event.id]
          const classification = override?.override_classification
            || classifications[event.id]?.classification
            || 'unreviewed'
          const confidence = classifications[event.id]?.confidence
          const approved = approvals.has(event.id)
          const selected = selectedEventId === event.id

          return (
            <button
              key={event.id}
              onClick={() => setSelectedEvent(selected ? null : event.id)}
              className={clsx(
                'w-full text-left px-3 py-2.5 border-b border-ops-border hover:bg-white/5 transition-colors',
                selected && 'bg-ops-accent/10 border-l-2 border-l-ops-accent',
              )}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={clsx('text-[9px] font-mono font-semibold tracking-wider', eventTypeColor[event.type])}>
                      {eventTypeLabel[event.type] || event.type}
                    </span>
                    <span className="text-[9px] font-mono text-ops-muted">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {approved && <span className="text-[9px] text-ops-green">✓</span>}
                    {override && <span className="text-[9px] text-blue-400">↺</span>}
                  </div>
                  <div className="text-[11px] text-ops-text leading-tight truncate">{event.title}</div>
                  <div className="text-[10px] text-ops-muted mt-0.5">{event.zone}</div>
                </div>
                <div className="flex-shrink-0 mt-0.5">
                  <span className={clsx(
                    'text-[9px] font-mono px-1.5 py-0.5 rounded border',
                    classificationBg[classification],
                  )}>
                    {classification === 'unreviewed' ? '—' : classification.slice(0, 4).toUpperCase()}
                    {confidence !== undefined && classification !== 'unreviewed' && (
                      <span className="ml-1 opacity-60">{Math.round(confidence * 100)}%</span>
                    )}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
