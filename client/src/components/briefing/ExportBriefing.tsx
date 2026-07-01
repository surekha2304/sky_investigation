import { useInvestigationStore } from '../../store/useInvestigationStore'

const classificationEmoji: Record<string, string> = {
  harmless: '✅',
  monitor: '⚠️',
  escalate: '🔴',
  unreviewed: '—',
}

export default function ExportBriefing() {
  const { briefingDraft, events, classifications, overrides, approvals, setShowExport } = useInvestigationStore()

  if (!briefingDraft) return null

  const getClassification = (eventId: string) => {
    const override = overrides[eventId]
    return override?.override_classification || classifications[eventId]?.classification || 'unreviewed'
  }

  const escalated = events.filter(e => getClassification(e.id) === 'escalate')
  const monitors = events.filter(e => getClassification(e.id) === 'monitor')
  const harmless = events.filter(e => getClassification(e.id) === 'harmless')

  const now = new Date()
  const approvedCount = approvals.size + Object.keys(overrides).length

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-ops-border flex items-center justify-between sticky top-0 bg-ops-panel z-10">
        <span className="text-[10px] font-mono text-ops-muted tracking-widest uppercase">
          Morning Briefing — Export
        </span>
        <button
          onClick={() => setShowExport(false)}
          className="text-[10px] font-mono text-ops-muted hover:text-ops-text transition-colors"
        >
          ← Back to Review
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-5 font-sans">
          {/* Header */}
          <div>
            <div className="text-[10px] font-mono text-ops-accent tracking-widest uppercase mb-1">
              Ridgeway Site Operations
            </div>
            <h1 className="text-xl font-semibold text-ops-text">Morning Security Briefing</h1>
            <div className="text-[11px] text-ops-muted mt-1">
              {now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {' · '}Generated {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {' · '}{approvedCount}/{events.length} events reviewed
            </div>
          </div>

          <hr className="border-ops-border" />

          {/* Summary */}
          <section>
            <h2 className="text-[11px] font-mono text-ops-muted uppercase tracking-widest mb-2">What Happened</h2>
            <p className="text-[13px] text-ops-text leading-relaxed">{briefingDraft.what_happened}</p>
          </section>

          {/* Escalations */}
          {escalated.length > 0 && (
            <section>
              <h2 className="text-[11px] font-mono text-ops-red uppercase tracking-widest mb-2">
                🔴 Requires Attention ({escalated.length})
              </h2>
              <ul className="space-y-2">
                {escalated.map(e => (
                  <li key={e.id} className="bg-ops-red/5 border border-ops-red/20 rounded p-2.5">
                    <div className="text-[12px] font-medium text-ops-text">{e.title}</div>
                    <div className="text-[11px] text-ops-muted mt-0.5">
                      {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {e.zone}
                    </div>
                    <div className="text-[11px] text-ops-text-dim mt-1">
                      {overrides[e.id]
                        ? `Override: ${overrides[e.id].reason.replace(/^["'"“‘]+|["'"”’]+$/g, '').trim()}`
                        : classifications[e.id]?.reasoning}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Monitor */}
          {monitors.length > 0 && (
            <section>
              <h2 className="text-[11px] font-mono text-ops-yellow uppercase tracking-widest mb-2">
                ⚠️ Monitor ({monitors.length})
              </h2>
              <ul className="space-y-1.5">
                {monitors.map(e => (
                  <li key={e.id} className="flex gap-2 text-[12px] text-ops-text">
                    <span className="text-ops-yellow flex-shrink-0">·</span>
                    <span>
                      <strong>{e.title}</strong>
                      <span className="text-ops-muted ml-2 text-[10px]">
                        {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Harmless */}
          {harmless.length > 0 && (
            <section>
              <h2 className="text-[11px] font-mono text-ops-green uppercase tracking-widest mb-2">
                ✅ Harmless / Cleared ({harmless.length})
              </h2>
              <ul className="space-y-1">
                {harmless.map(e => (
                  <li key={e.id} className="text-[11px] text-ops-muted flex gap-2">
                    <span className="text-ops-green flex-shrink-0">✓</span>
                    <span>{e.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Drone */}
          <section>
            <h2 className="text-[11px] font-mono text-ops-muted uppercase tracking-widest mb-2">
              🚁 Drone Patrol Coverage
            </h2>
            <p className="text-[12px] text-ops-text leading-relaxed">{briefingDraft.drone_coverage_summary}</p>
          </section>

          {/* Block C */}
          <section className="bg-ops-yellow/5 border border-ops-yellow/20 rounded p-3">
            <h2 className="text-[11px] font-mono text-ops-yellow uppercase tracking-widest mb-2">
              Re: Block C — Raghav's Note
            </h2>
            <p className="text-[12px] text-ops-text leading-relaxed">{briefingDraft.raghav_note_response}</p>
          </section>

          {/* Follow-up */}
          {briefingDraft.follow_up_needed.length > 0 && (
            <section>
              <h2 className="text-[11px] font-mono text-ops-muted uppercase tracking-widest mb-2">
                Follow-up Required
              </h2>
              <ul className="space-y-1.5">
                {briefingDraft.follow_up_needed.map((item, i) => {
                  // If the AI returned a raw event ID (e.g. "evt_002"), resolve it to the event title
                  const resolvedEvent = /^evt_\d+$/.test(item.trim())
                    ? events.find(e => e.id === item.trim())
                    : null
                  const label = resolvedEvent
                    ? `${resolvedEvent.title} — ${new Date(resolvedEvent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : item
                  return (
                    <li key={i} className="text-[12px] text-ops-text flex gap-2">
                      <span className="text-ops-accent flex-shrink-0">→</span>
                      <span>{label}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <hr className="border-ops-border" />
          <div className="text-[10px] text-ops-muted font-mono">
            Generated by 6:10 Assistant · Ridgeway Site Intelligence Platform · AI-assisted, human-reviewed
          </div>
        </div>
      </div>
    </div>
  )
}
