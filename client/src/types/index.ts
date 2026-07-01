export type EventType =
  | 'fence_alert'
  | 'vehicle_path'
  | 'badge_swipe_failed'
  | 'drone_patrol'
  | 'motion_sensor'
  | 'camera_fault'
  | 'weather'

export type Classification = 'harmless' | 'monitor' | 'escalate' | 'unreviewed'

export interface SiteEvent {
  id: string
  timestamp: string    // ISO string
  type: EventType
  zone: string
  title: string
  description: string
  coordinates: [number, number]  // [lat, lng]
  metadata?: Record<string, unknown>
}

export interface EventClassification {
  event_id: string
  classification: Classification
  confidence: number   // 0–1
  reasoning: string
  uncertainty?: string
}

export interface BriefingDraft {
  overall_assessment: string
  event_classifications: EventClassification[]
  drone_coverage_summary: string
  what_happened: string
  harmless_items: string[]
  escalate_items: string[]
  follow_up_needed: string[]
  raghav_note_response: string
}

// SSE stream event types from agent
export type AgentStreamEvent =
  | { type: 'tool_call'; tool: string; input: Record<string, unknown>; reasoning: string }
  | { type: 'tool_result'; tool: string; output: unknown }
  | { type: 'classification'; data: EventClassification }
  | { type: 'briefing_draft'; data: BriefingDraft }
  | { type: 'status'; message: string }
  | { type: 'error'; message: string }
  | { type: 'done' }

export interface SiteZone {
  id: string
  name: string
  type: 'gate' | 'block' | 'storage' | 'access_point' | 'drone_base'
  coordinates: [number, number][]   // polygon corners [lat, lng]
  center: [number, number]
  restrictionLevel: 'open' | 'controlled' | 'restricted'
}

export interface DroneWaypoint {
  coordinates: [number, number]
  timestamp: string
  zone: string
  observation?: string
}

export interface DronePatrol {
  id: string
  name: string
  startTime: string
  endTime: string
  waypoints: DroneWaypoint[]
  status: 'completed' | 'simulated_followup'
}

export interface HumanOverride {
  event_id: string
  original_classification: Classification
  override_classification: Classification
  reason: string
  timestamp: string
}

export type InvestigationState = 'idle' | 'investigating' | 'complete' | 'error'
