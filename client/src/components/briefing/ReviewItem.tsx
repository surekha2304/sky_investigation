import { useState } from 'react'
import clsx from 'clsx'
import { useInvestigationStore } from '../../store/useInvestigationStore'
import type { SiteEvent, Classification } from '../../types'

interface Props {
  event: SiteEvent
}

const classificationConfig: Record<Classification, { label: string; color: string; bg: string }> = {
  harmless: { label: 'Harmless', color: 'text-ops-green', bg: 'bg-ops-green/10 border-ops-green/30' },
  monitor: { label: 'Monitor', color: 'text-ops-yellow', bg: 'bg-ops-yellow/10 border-ops-yellow/30' },
  escalate: { label: 'Escalate', color: 'text-ops-red', bg: 'bg-ops-red/10 border-ops-red/30' },
  unreviewed: { label: 'Unreviewed', color: 'text-ops-muted', bg: 'bg-ops-muted/10 border-ops-muted/30' },
}

export default function ReviewItem({ event }: Props) {
  const { classifications, overrides, approvals, approveEvent, overrideEvent, setFollowupPatrol } = useInvestigationStore()
  const [showOverride, setShowOverride] = useState(false)
  const [overrideClass, setOverrideClass] = useState<Classification>('monitor')
  const [overrideReason, setOverrideReason] = useState('')
  const [dispatchingDrone, setDispatchingDrone] = useState(false)
  const [droneFindings, setDroneFindings] = useState<{ overall: string; findings: string[]; confidence: number } | null>(null)

  const override = overrides[event.id]
  const classification = override?.override_classification
    || classifications[event.id]?.classification
    || 'unreviewed'
  const conf = classifications[event.id]
  const approved = approvals.has(event.id)
  const cfg = classificationConfig[classification]
  const isLowConfidence = conf && conf.confidence < 0.8 && !approved

  const handleDispatchDrone = async () => {
    setDispatchingDrone(true)
    try {
      const res = await fetch('/api/mcp/simulate_drone_followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_id: event.zone, focus: conf?.reasoning }),
      })
      const data = await res.json()
      const result = data.result
      if (result?.waypoints) {
        setFollowupPatrol({
          id: 'followup_' + event.id,
          name: 'Follow-up Drone',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          status: 'simulated_followup',
          waypoints: result.waypoints.map((w: { coordinates: [number, number]; timestamp: string; note?: string }) => ({
            coordinates: w.coordinates,
            timestamp: new Date().toISOString(),
            zone: event.zone,
            observation: w.note,
          })),
        })
      }
      if (result?.findings) {
        setDroneFindings({
          overall: result.overall ?? '',
          findings: result.findings ?? [],
          confidence: result.confidence ?? 0,
        })
      }
    } finally {
      setDispatchingDrone(false)
    }
  }

  return (
    <div className={clsx(
      'rounded border p-3 transition-all',
      approved ? 'border-ops-green/30 bg-ops-green/5' : 'border-ops-border bg-ops-bg',
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-mono text-ops-muted mb-0.5">
            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {event.zone}
          </div>
          <div className="text-[12px] text-ops-text font-medium leading-tight">{event.title}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isLowConfidence && (
            <span className="text-[9px] font-mono text-ops-yellow border border-ops-yellow/40 bg-ops-yellow/10 px-1.5 py-0.5 rounded">
              ⚠ LOW CONFIDENCE
            </span>
          )}
          <span className={clsx('text-[10px] font-mono px-1.5 py-0.5 rounded border', cfg.bg, cfg.color)}>
            {cfg.label}
            {conf && <span className="ml-1 opacity-60">{Math.round(conf.confidence * 100)}%</span>}
          </span>
        </div>
      </div>

      {conf && (
        <div className="text-[11px] text-ops-text-dim leading-relaxed mb-2">{conf.reasoning}</div>
      )}
      {conf?.uncertainty && (
        <div className="text-[11px] text-ops-yellow bg-ops-yellow/5 border border-ops-yellow/20 rounded px-2 py-1.5 mb-2">
          <span className="font-semibold">Uncertainty: </span>{conf.uncertainty}
        </div>
      )}
      {override && (
        <div className="text-[10px] text-blue-400 bg-blue-400/5 border border-blue-400/20 rounded px-2 py-1 mb-2">
          Overridden: {override.reason.replace(/^["'""']+|["'""']+$/g, '').trim()}
        </div>
      )}

      {!approved && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <button
            onClick={() => approveEvent(event.id)}
            className="text-[10px] font-mono px-2 py-1 rounded border border-ops-green/40 text-ops-green hover:bg-ops-green/10 transition-colors"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => setShowOverride(!showOverride)}
            className="text-[10px] font-mono px-2 py-1 rounded border border-ops-muted/40 text-ops-muted hover:bg-white/5 transition-colors"
          >
            ✗ Override
          </button>
          {isLowConfidence && (
            <button
              onClick={handleDispatchDrone}
              disabled={dispatchingDrone}
              className="text-[10px] font-mono px-2 py-1 rounded border border-blue-400/40 text-blue-400 hover:bg-blue-400/10 transition-colors disabled:opacity-50"
            >
              {dispatchingDrone ? '⏳ Dispatching...' : '🛸 Dispatch Drone'}
            </button>
          )}
        </div>
      )}

      {approved && (
        <div className="text-[10px] font-mono text-ops-green mt-1">✓ Approved for briefing</div>
      )}

      {droneFindings && (
        <div className="mt-3 p-2 bg-blue-400/5 border border-blue-400/20 rounded space-y-2 animate-slide-in">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🛸</span>
            <span className="text-[9px] font-mono text-blue-400 tracking-widest uppercase">Follow-up Drone Report</span>
            <span className="text-[9px] font-mono text-ops-muted ml-auto">{Math.round(droneFindings.confidence * 100)}% confidence</span>
          </div>
          <p className="text-[11px] text-ops-text leading-relaxed">{droneFindings.overall}</p>
          <ul className="space-y-1">
            {droneFindings.findings.map((f, i) => (
              <li key={i} className="text-[10px] text-ops-text-dim flex gap-1.5">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">·</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showOverride && (
        <div className="mt-3 p-2 bg-ops-panel rounded border border-ops-border space-y-2">
          <div className="text-[10px] font-mono text-ops-muted">Override classification:</div>
          <div className="flex gap-2">
            {(['harmless', 'monitor', 'escalate'] as Classification[]).map(c => (
              <button
                key={c}
                onClick={() => setOverrideClass(c)}
                className={clsx(
                  'text-[10px] font-mono px-2 py-1 rounded border transition-colors',
                  overrideClass === c
                    ? `${classificationConfig[c].bg} ${classificationConfig[c].color} border-current`
                    : 'border-ops-border text-ops-muted hover:bg-white/5',
                )}
              >
                {classificationConfig[c].label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Reason for override..."
            value={overrideReason}
            onChange={e => setOverrideReason(e.target.value)}
            className="w-full text-[11px] bg-ops-bg border border-ops-border rounded px-2 py-1.5 text-ops-text placeholder-ops-muted focus:outline-none focus:border-ops-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (overrideReason.trim()) {
                  overrideEvent(event.id, overrideClass, overrideReason.trim())
                  setShowOverride(false)
                  setOverrideReason('')
                }
              }}
              className="text-[10px] font-mono px-2 py-1 rounded bg-ops-accent text-white hover:bg-ops-accent/90 transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => setShowOverride(false)}
              className="text-[10px] font-mono px-2 py-1 rounded border border-ops-border text-ops-muted hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
