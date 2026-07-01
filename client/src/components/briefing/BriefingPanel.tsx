import { useInvestigationStore } from '../../store/useInvestigationStore'
import ReviewItem from './ReviewItem'
import ExportBriefing from './ExportBriefing'

export default function BriefingPanel() {
  const { investigationState, briefingDraft, events, approvals, overrides, setShowExport, showExport } = useInvestigationStore()

  const totalApproved = approvals.size + Object.keys(overrides).length
  const totalClassified = events.length

  if (showExport && briefingDraft) {
    return <ExportBriefing />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-ops-border flex items-center justify-between sticky top-0 bg-ops-panel z-10">
        <span className="text-[10px] font-mono text-ops-muted tracking-widest uppercase">
          Morning Briefing
        </span>
        {investigationState === 'complete' && briefingDraft && (
          <button
            onClick={() => setShowExport(true)}
            className="text-[10px] font-mono px-2 py-1 rounded bg-ops-accent text-white hover:bg-ops-accent/90 transition-colors"
          >
            Export →
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {investigationState === 'idle' && (
          <div className="text-[11px] text-ops-muted text-center mt-8">
            Press <span className="text-ops-accent font-semibold">Begin Investigation</span> to start
          </div>
        )}

        {investigationState === 'investigating' && !briefingDraft && (
          <div className="text-[11px] text-ops-muted text-center mt-8">
            <div className="mb-2">Agent investigating...</div>
            <div className="text-ops-accent animate-pulse">Building briefing draft</div>
          </div>
        )}

        {briefingDraft && (
          <>
            {/* Overall assessment */}
            <div className="bg-ops-bg rounded border border-ops-border p-3">
              <div className="text-[9px] font-mono text-ops-muted tracking-widest uppercase mb-2">Overall Assessment</div>
              <p className="text-[12px] text-ops-text leading-relaxed">{briefingDraft.overall_assessment}</p>
            </div>

            {/* Raghav's note */}
            <div className="bg-ops-yellow/5 rounded border border-ops-yellow/30 p-3">
              <div className="text-[9px] font-mono text-ops-yellow tracking-widest uppercase mb-2">
                Re: "Check Block C" — Raghav's Note
              </div>
              <p className="text-[12px] text-ops-text leading-relaxed">{briefingDraft.raghav_note_response}</p>
            </div>

            {/* Drone coverage */}
            <div className="bg-ops-bg rounded border border-ops-border p-3">
              <div className="text-[9px] font-mono text-ops-muted tracking-widest uppercase mb-2">🚁 Drone Coverage</div>
              <p className="text-[12px] text-ops-text leading-relaxed">{briefingDraft.drone_coverage_summary}</p>
            </div>

            {/* Review progress */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-ops-muted">
                Review progress: {totalApproved}/{totalClassified}
              </span>
              <div className="w-32 h-1.5 bg-ops-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-ops-accent rounded-full transition-all"
                  style={{ width: `${totalClassified > 0 ? (totalApproved / totalClassified) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Per-event review */}
            <div>
              <div className="text-[9px] font-mono text-ops-muted tracking-widest uppercase mb-2">Event Review</div>
              <div className="space-y-2">
                {events.map(event => (
                  <ReviewItem key={event.id} event={event} />
                ))}
              </div>
            </div>

            {/* Follow-up needed */}
            {briefingDraft.follow_up_needed.length > 0 && (
              <div className="bg-ops-bg rounded border border-ops-border p-3">
                <div className="text-[9px] font-mono text-ops-muted tracking-widest uppercase mb-2">
                  Follow-up Required
                </div>
                <ul className="space-y-1">
                  {briefingDraft.follow_up_needed.map((item, i) => {
                    const resolvedEvent = /^evt_\d+$/.test(item.trim())
                      ? events.find(e => e.id === item.trim())
                      : null
                    const label = resolvedEvent
                      ? `${resolvedEvent.title} — ${new Date(resolvedEvent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : item
                    return (
                      <li key={i} className="text-[11px] text-ops-text flex gap-2">
                        <span className="text-ops-accent flex-shrink-0">→</span>
                        <span>{label}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
