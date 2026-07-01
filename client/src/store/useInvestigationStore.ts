import { create } from 'zustand'
import type {
  SiteEvent, SiteZone, DronePatrol, BriefingDraft,
  AgentStreamEvent, EventClassification, HumanOverride, InvestigationState,
} from '../types'

interface AgentActivity {
  id: string
  type: AgentStreamEvent['type']
  timestamp: string
  tool?: string
  input?: Record<string, unknown>
  output?: unknown
  reasoning?: string
  message?: string
}

interface InvestigationStore {
  // Site data
  events: SiteEvent[]
  zones: SiteZone[]
  dronePatrol: DronePatrol | null
  followupPatrol: DronePatrol | null

  // Agent state
  investigationState: InvestigationState
  agentActivity: AgentActivity[]
  classifications: Record<string, EventClassification>
  briefingDraft: BriefingDraft | null

  // Human review
  overrides: Record<string, HumanOverride>
  approvals: Set<string>

  // UI state
  selectedEventId: string | null
  showExport: boolean

  // Actions
  setSiteData: (events: SiteEvent[], zones: SiteZone[], patrol: DronePatrol) => void
  startInvestigation: () => void
  handleAgentEvent: (event: AgentStreamEvent) => void
  approveEvent: (eventId: string) => void
  overrideEvent: (eventId: string, classification: EventClassification['classification'], reason: string) => void
  setSelectedEvent: (id: string | null) => void
  setFollowupPatrol: (patrol: DronePatrol) => void
  setShowExport: (show: boolean) => void
  reset: () => void
}

let activityCounter = 0

export const useInvestigationStore = create<InvestigationStore>((set, get) => ({
  events: [],
  zones: [],
  dronePatrol: null,
  followupPatrol: null,
  investigationState: 'idle',
  agentActivity: [],
  classifications: {},
  briefingDraft: null,
  overrides: {},
  approvals: new Set(),
  selectedEventId: null,
  showExport: false,

  setSiteData: (events, zones, patrol) => set({ events, zones, dronePatrol: patrol }),

  startInvestigation: () => {
    set({ investigationState: 'investigating', agentActivity: [], classifications: {}, briefingDraft: null })

    const eventSource = new EventSource('/api/agent', { withCredentials: false })

    // EventSource only supports GET — use fetch with SSE manually
    eventSource.close()

    fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(async (res) => {
        if (!res.body) throw new Error('No response body')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: AgentStreamEvent = JSON.parse(line.slice(6))
                get().handleAgentEvent(event)
              } catch { /* skip malformed */ }
            }
          }
        }
      })
      .catch(err => {
        set(s => ({
          investigationState: 'error',
          agentActivity: [...s.agentActivity, {
            id: String(activityCounter++),
            type: 'error',
            timestamp: new Date().toISOString(),
            message: `Connection error: ${err.message}`,
          }],
        }))
      })
  },

  handleAgentEvent: (event) => {
    const activity: AgentActivity = {
      id: String(activityCounter++),
      type: event.type,
      timestamp: new Date().toISOString(),
    }

    switch (event.type) {
      case 'tool_call':
        set(s => ({
          agentActivity: [...s.agentActivity, {
            ...activity, tool: event.tool, input: event.input, reasoning: event.reasoning,
          }],
        }))
        break
      case 'tool_result':
        set(s => ({
          agentActivity: [...s.agentActivity, { ...activity, tool: event.tool, output: event.output }],
        }))
        break
      case 'classification':
        set(s => ({
          classifications: { ...s.classifications, [event.data.event_id]: event.data },
          agentActivity: [...s.agentActivity, { ...activity, message: `Classified ${event.data.event_id} as ${event.data.classification}` }],
        }))
        break
      case 'briefing_draft':
        set({ briefingDraft: event.data })
        break
      case 'status':
        set(s => ({ agentActivity: [...s.agentActivity, { ...activity, message: event.message }] }))
        break
      case 'error':
        set(s => ({
          investigationState: 'error',
          agentActivity: [...s.agentActivity, { ...activity, message: event.message }],
        }))
        break
      case 'done':
        set(s => ({
          investigationState: s.briefingDraft ? 'complete' : s.investigationState === 'error' ? 'error' : 'complete',
        }))
        break
    }
  },

  approveEvent: (eventId) =>
    set(s => {
      const next = new Set(s.approvals)
      next.add(eventId)
      return { approvals: next }
    }),

  overrideEvent: (eventId, classification, reason) =>
    set(s => ({
      overrides: {
        ...s.overrides,
        [eventId]: {
          event_id: eventId,
          original_classification: s.classifications[eventId]?.classification || 'unreviewed',
          override_classification: classification,
          reason,
          timestamp: new Date().toISOString(),
        },
      },
    })),

  setSelectedEvent: (id) => set({ selectedEventId: id }),

  setFollowupPatrol: (patrol) => set({ followupPatrol: patrol }),

  setShowExport: (show) => set({ showExport: show }),

  reset: () => set({
    investigationState: 'idle',
    agentActivity: [],
    classifications: {},
    briefingDraft: null,
    overrides: {},
    approvals: new Set(),
    followupPatrol: null,
    selectedEventId: null,
    showExport: false,
  }),
}))
