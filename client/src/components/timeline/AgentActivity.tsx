import { useEffect, useRef } from 'react'
import { useInvestigationStore } from '../../store/useInvestigationStore'
import clsx from 'clsx'

const toolIcons: Record<string, string> = {
  get_events: '📋',
  get_zone_info: '🏢',
  get_drone_patrol_log: '🚁',
  correlate_nearby_events: '🔗',
  get_weather_data: '🌬',
  get_access_log: '🔑',
  get_contractor_schedule: '📅',
  simulate_drone_followup: '🛸',
}

export default function AgentActivity() {
  const { agentActivity, investigationState } = useInvestigationStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentActivity.length])

  const isPulsing = investigationState === 'investigating'

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-ops-border sticky top-0 bg-ops-panel z-10 flex items-center gap-2">
        <span className="text-[10px] font-mono text-ops-muted tracking-widest uppercase">
          Agent Activity
        </span>
        {isPulsing && (
          <span className="flex gap-0.5 items-center">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-ops-accent"
                style={{ animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {agentActivity.length === 0 && (
          <div className="text-[11px] text-ops-muted text-center mt-4 font-mono">
            Waiting for investigation to start...
          </div>
        )}
        {agentActivity.map(activity => (
          <div key={activity.id} className="animate-slide-in">
            {activity.type === 'tool_call' && (
              <div className="bg-ops-bg rounded p-2 border border-ops-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs">{toolIcons[activity.tool || ''] || '🔧'}</span>
                  <span className="text-[10px] font-mono text-ops-accent font-semibold">{activity.tool}</span>
                  <span className="text-[9px] font-mono text-ops-muted ml-auto">
                    {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                {activity.reasoning && (
                  <div className="text-[10px] text-ops-text-dim italic mb-1 leading-relaxed">{activity.reasoning}</div>
                )}
                {activity.input && Object.keys(activity.input).length > 0 && (
                  <div className="text-[9px] font-mono text-ops-muted bg-black/20 rounded px-1.5 py-1">
                    {Object.entries(activity.input).map(([k, v]) => (
                      <div key={k}><span className="text-blue-400">{k}</span>: {String(v)}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activity.type === 'tool_result' && (
              <div className="pl-3 border-l-2 border-ops-green/40">
                <span className="text-[9px] font-mono text-ops-green">
                  ✓ {activity.tool} returned data
                </span>
              </div>
            )}
            {activity.type === 'classification' && (
              <div className="pl-3 border-l-2 border-blue-500/40">
                <span className="text-[9px] font-mono text-blue-400">{activity.message}</span>
              </div>
            )}
            {activity.type === 'status' && (
              <div className="text-[10px] font-mono text-ops-muted">{activity.message}</div>
            )}
            {activity.type === 'error' && (
              <div className="text-[10px] font-mono text-ops-red bg-ops-red/10 border border-ops-red/30 rounded px-2 py-1">
                ⚠ {activity.message}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
