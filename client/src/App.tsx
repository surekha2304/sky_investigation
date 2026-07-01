import { useEffect, lazy, Suspense } from 'react'
import { useInvestigationStore } from './store/useInvestigationStore'
import EventTimeline from './components/timeline/EventTimeline'
import AgentActivity from './components/timeline/AgentActivity'
import BriefingPanel from './components/briefing/BriefingPanel'
import type { SiteEvent, SiteZone, DronePatrol } from './types'

const SiteMap = lazy(() => import('./components/map/SiteMap'))

function Header() {
  const { investigationState, startInvestigation, reset, briefingDraft } = useInvestigationStore()

  return (
    <header className="h-10 border-b border-ops-border bg-ops-panel flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-ops-accent animate-pulse" />
        <span className="text-[11px] font-mono text-ops-accent font-semibold tracking-widest">6:10</span>
        <span className="text-[11px] font-mono text-ops-muted">ASSISTANT</span>
        <span className="text-[9px] font-mono text-ops-muted/50 hidden sm:inline">· RIDGEWAY SITE</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-[9px] font-mono text-ops-muted hidden md:flex items-center gap-3">
          <span>
            {investigationState === 'idle' && '—'}
            {investigationState === 'investigating' && (
              <span className="text-ops-accent animate-pulse">● INVESTIGATING</span>
            )}
            {investigationState === 'complete' && <span className="text-ops-green">● COMPLETE</span>}
            {investigationState === 'error' && <span className="text-ops-red">● ERROR</span>}
          </span>
        </div>

        {investigationState !== 'idle' && (
          <button
            onClick={reset}
            className="text-[10px] font-mono px-2 py-1 rounded border border-ops-border text-ops-muted hover:bg-white/5 transition-colors"
          >
            Reset
          </button>
        )}

        {investigationState === 'idle' && (
          <button
            onClick={startInvestigation}
            className="text-[10px] font-mono px-3 py-1.5 rounded bg-ops-accent text-white hover:bg-ops-accent/90 transition-colors font-semibold"
          >
            Begin Investigation
          </button>
        )}
      </div>
    </header>
  )
}

export default function App() {
  const { setSiteData, investigationState } = useInvestigationStore()

  useEffect(() => {
    Promise.all([
      fetch('/api/site/events').then(r => r.json()),
      fetch('/api/site/zones').then(r => r.json()),
      fetch('/api/site/drone-patrol').then(r => r.json()),
    ]).then(([eventsData, zonesData, patrolData]) => {
      setSiteData(
        eventsData.events as SiteEvent[],
        zonesData.zones as SiteZone[],
        patrolData.patrol as DronePatrol,
      )
    }).catch(console.error)
  }, [setSiteData])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-ops-bg">
      <Header />

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left panel: Timeline + Agent Activity */}
        <div className="w-72 flex-shrink-0 border-r border-ops-border flex flex-col overflow-hidden">
          <div className="h-1/2 flex flex-col overflow-hidden border-b border-ops-border">
            <EventTimeline />
          </div>
          <div className="h-1/2 flex flex-col overflow-hidden">
            <AgentActivity />
          </div>
        </div>

        {/* Center panel: Map */}
        <div className="flex-1 relative overflow-hidden">
          <Suspense fallback={
            <div className="h-full flex items-center justify-center text-ops-muted text-[11px] font-mono">
              Loading map...
            </div>
          }>
            <SiteMap />
          </Suspense>

          {/* Map overlay hints */}
          {investigationState === 'idle' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-ops-panel/90 border border-ops-border rounded px-3 py-2 text-[10px] font-mono text-ops-muted backdrop-blur-sm">
              Press Begin Investigation to start the AI analysis
            </div>
          )}
        </div>

        {/* Right panel: Briefing */}
        <div className="w-80 flex-shrink-0 border-l border-ops-border flex flex-col overflow-hidden bg-ops-panel">
          <BriefingPanel />
        </div>

      </div>
    </div>
  )
}
