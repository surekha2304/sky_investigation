/**
 * MCP-style tool server for Ridgeway Site investigation.
 * Tools are defined using MCP SDK tool schema format and callable directly.
 */
import { OVERNIGHT_EVENTS, getEventsInTimeRange } from '../data/events'
import { SITE_ZONES, DRONE_PATROL_ALPHA } from '../data/site'

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required?: string[]
  }
}

export interface ToolCallResult {
  success: boolean
  data: unknown
  error?: string
}

// ─── Tool Definitions (MCP schema format) ────────────────────────────────────

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_events',
    description: 'Fetch overnight events filtered by zone, time range, or event type. Use this to retrieve raw event data for a specific area or time window.',
    inputSchema: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'Zone ID to filter events (e.g. gate3, block_c, yard_b, access_point_7). Omit to get all zones.' },
        from_time: { type: 'string', description: 'ISO timestamp start of time range. Omit for no lower bound.' },
        to_time: { type: 'string', description: 'ISO timestamp end of time range. Omit for no upper bound.' },
        event_type: {
          type: 'string',
          description: 'Filter by specific event type. Omit this field entirely to get all event types.',
          enum: ['fence_alert', 'vehicle_path', 'badge_swipe_failed', 'drone_patrol', 'motion_sensor', 'camera_fault', 'weather'],
        },
      },
    },
  },
  {
    name: 'get_zone_info',
    description: 'Get details about a site zone: access policy, restriction level, authorized personnel roles, and what activity is normally expected there.',
    inputSchema: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'Zone ID to look up' },
      },
      required: ['zone_id'],
    },
  },
  {
    name: 'get_drone_patrol_log',
    description: 'Retrieve the drone patrol flight log including waypoints, timestamps, zones visited, and observations recorded at each point.',
    inputSchema: {
      type: 'object',
      properties: {
        patrol_id: { type: 'string', description: 'Patrol ID (default: patrol_alpha_2024)' },
      },
    },
  },
  {
    name: 'correlate_nearby_events',
    description: 'Find other events that occurred near the same location (within ~200m) and within a time window of a reference event. Useful for detecting related incidents.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'Reference event ID to correlate from' },
        time_window_minutes: { type: 'string', description: 'Look for events within this many minutes of the reference (default: 60)' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'get_weather_data',
    description: 'Get weather conditions recorded at or near a zone during the overnight period. Use this to contextualise physical sensor alerts (e.g. fence vibration in high wind).',
    inputSchema: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'Zone to get weather data for' },
        timestamp: { type: 'string', description: 'Approximate time of interest (ISO string)' },
      },
      required: ['zone_id'],
    },
  },
  {
    name: 'get_access_log',
    description: 'Get the full badge swipe access log for a location including successful entries, failed attempts, and any patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'Zone/access point to query' },
        from_time: { type: 'string', description: 'Start of period (ISO string)' },
        to_time: { type: 'string', description: 'End of period (ISO string)' },
      },
      required: ['zone_id'],
    },
  },
  {
    name: 'get_contractor_schedule',
    description: 'Check which contractors or personnel were authorized to be on-site and in which zones during the overnight period.',
    inputSchema: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'Zone to check authorized access for (optional — omit for full site)' },
        shift: {
          type: 'string',
          description: 'Shift period',
          enum: ['night', 'early_morning', 'all'],
        },
      },
    },
  },
  {
    name: 'simulate_drone_followup',
    description: 'Dispatch a simulated follow-up drone to a zone for additional observation. Returns a mock observation report with findings. Use when initial data is ambiguous.',
    inputSchema: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'Zone to investigate' },
        focus: { type: 'string', description: 'What specifically to look for (e.g. "camera unit status", "signs of entry")' },
      },
      required: ['zone_id'],
    },
  },
]

// ─── Tool Handlers ────────────────────────────────────────────────────────────

const VALID_EVENT_TYPES = new Set(['fence_alert','vehicle_path','badge_swipe_failed','drone_patrol','motion_sensor','camera_fault','weather'])

function get_events(input: Record<string, string>): unknown {
  let events = [...OVERNIGHT_EVENTS]
  if (input.zone_id && input.zone_id !== 'all') events = events.filter(e => e.zone === input.zone_id)
  if (input.event_type && VALID_EVENT_TYPES.has(input.event_type)) events = events.filter(e => e.type === input.event_type)
  if (input.from_time && input.to_time) events = getEventsInTimeRange(input.from_time, input.to_time)
  return {
    total: events.length,
    events: events.map(e => ({
      id: e.id, timestamp: e.timestamp, type: e.type, zone: e.zone,
      title: e.title, description: e.description, metadata: e.metadata,
    })),
  }
}

function get_zone_info(input: Record<string, string>): unknown {
  const zone = SITE_ZONES.find(z => z.id === input.zone_id)
  if (!zone) return { error: `Zone '${input.zone_id}' not found` }

  const zoneDetails: Record<string, unknown> = {
    gate3: {
      access_policy: 'Controlled entry. Requires valid site badge. Security guard on day shifts only.',
      authorized_roles: ['site_security', 'maintenance', 'contractors_with_escort'],
      normal_overnight_activity: 'None expected. Gate should be locked. Drone patrols pass through.',
      notes: 'Fence line susceptible to wind vibration in high wind events (>35 km/h).',
    },
    block_c: {
      access_policy: 'Controlled. Site badge required. Nighttime access restricted to security only.',
      authorized_roles: ['site_security', 'emergency_maintenance'],
      normal_overnight_activity: 'None expected.',
      notes: 'Camera CAM-C-EAST-1 has a history of intermittent power faults (last fault: 2023-11-08). East perimeter has known rabbit/fox activity triggering PIR sensors.',
    },
    yard_b: {
      access_policy: 'Restricted. Dual authorization required. Vehicle access requires advance booking.',
      authorized_roles: ['senior_security', 'authorized_haulage'],
      normal_overnight_activity: 'No authorized vehicle access between 22:00–06:00.',
      notes: 'Haulage contractor (Fleet ID: HG-442) had a booking for 03:00 but it was cancelled same-day. South service road is a known shortcut used informally by site staff.',
    },
    access_point_7: {
      access_policy: 'Controlled. Badge swipe required. Links Block C to main site road.',
      authorized_roles: ['all_site_staff', 'contractors'],
      normal_overnight_activity: 'Minimal. Occasional security patrol passage.',
      notes: 'Reader AP7-READER-A has had intermittent issues in cold temperatures. Last maintenance: 2023-12-20.',
    },
    drone_base: {
      access_policy: 'Open to authorized drone operations team.',
      authorized_roles: ['drone_operators', 'site_security'],
      normal_overnight_activity: 'Scheduled nightly patrol launches from 04:30.',
      notes: '',
    },
  }

  return {
    zone: { id: zone.id, name: zone.name, type: zone.type, restrictionLevel: zone.restrictionLevel },
    ...(zoneDetails[input.zone_id] || { notes: 'No additional details on file.' }),
  }
}

function get_drone_patrol_log(): unknown {
  return {
    patrol: {
      id: DRONE_PATROL_ALPHA.id,
      name: DRONE_PATROL_ALPHA.name,
      startTime: DRONE_PATROL_ALPHA.startTime,
      endTime: DRONE_PATROL_ALPHA.endTime,
      status: DRONE_PATROL_ALPHA.status,
      duration_minutes: 35,
      zones_covered: ['drone_base', 'block_c', 'gate3', 'yard_b'],
      waypoints: DRONE_PATROL_ALPHA.waypoints,
    },
    coverage_note: 'Patrol covered Gate 3 and Yard B. Block C was overflown at 04:50 — approximately 20 minutes BEFORE the 05:10 motion sensor event.',
  }
}

function correlate_nearby_events(input: Record<string, string>): unknown {
  const ref = OVERNIGHT_EVENTS.find(e => e.id === input.event_id)
  if (!ref) return { error: `Event ${input.event_id} not found` }
  const windowMins = parseInt(input.time_window_minutes || '60', 10)
  const refTime = new Date(ref.timestamp).getTime()

  // Simple spatial proximity: same zone or adjacent zones
  const adjacentZones: Record<string, string[]> = {
    gate3: ['block_c', 'gate3'],
    block_c: ['gate3', 'access_point_7', 'block_c'],
    yard_b: ['yard_b'],
    access_point_7: ['block_c', 'access_point_7'],
    drone_base: ['drone_base', 'block_b'],
  }
  const nearbyZones = adjacentZones[ref.zone] || [ref.zone]

  const correlated = OVERNIGHT_EVENTS.filter(e => {
    if (e.id === ref.id) return false
    const t = new Date(e.timestamp).getTime()
    const timeDiff = Math.abs(t - refTime) / 60000
    return nearbyZones.includes(e.zone) && timeDiff <= windowMins
  })

  return {
    reference_event: { id: ref.id, timestamp: ref.timestamp, zone: ref.zone, title: ref.title },
    window_minutes: windowMins,
    correlated_events: correlated.map(e => ({
      id: e.id, timestamp: e.timestamp, type: e.type, zone: e.zone, title: e.title,
      time_diff_minutes: Math.round((new Date(e.timestamp).getTime() - refTime) / 60000),
    })),
    summary: correlated.length === 0
      ? 'No nearby events found in the time window.'
      : `Found ${correlated.length} correlated event(s) in nearby zones.`,
  }
}

function get_weather_data(input: Record<string, string>): unknown {
  // All zones get the same weather data (same site)
  return {
    zone: input.zone_id,
    recorded_at: '2024-01-15T06:00:00',
    nearest_station: 'WS-GATE3',
    conditions: {
      wind_speed_kmh: 43,
      wind_gusts_kmh: 58,
      wind_direction: 'WSW',
      temperature_c: 6,
      precipitation: 'none',
      visibility_m: 8000,
    },
    overnight_summary: 'Wind speed built steadily from ~18 km/h at 22:00 to 43 km/h sustained by 06:00. Gusts reached 58 km/h around 01:00–02:00. Conditions consistent with fence vibration alerts at perimeter sensors.',
    threshold_note: 'Site fence vibration sensors are known to trigger at wind gusts above 35 km/h. The 01:23 alert falls within this known false-positive window.',
  }
}

function get_access_log(input: Record<string, string>): unknown {
  if (input.zone_id === 'access_point_7') {
    return {
      zone: 'access_point_7',
      period: { from: '2024-01-14T22:00:00', to: '2024-01-15T06:10:00' },
      successful_entries: [
        { time: '2024-01-14T22:47:00', badge_holder: 'Security Officer (Night Shift)', badge_id: 'SEC-017', direction: 'entry' },
        { time: '2024-01-15T00:12:00', badge_holder: 'Security Officer (Night Shift)', badge_id: 'SEC-017', direction: 'exit' },
      ],
      failed_attempts: [
        { time: '2024-01-15T03:15:00', badge_id: 'UNKNOWN', note: 'Badge not read — possible damaged/missing badge or reader cold-weather fault' },
        { time: '2024-01-15T03:16:00', badge_id: 'UNKNOWN', note: 'Repeat attempt' },
        { time: '2024-01-15T03:18:00', badge_id: 'UNKNOWN', note: 'Third attempt — access log flag triggered' },
      ],
      reader_status: 'Reader AP7-READER-A operating at low temperature (3°C ambient). Cold weather glitching is documented for this reader model below 5°C.',
      analysis: 'Three failed swipes with unreadable badge ID. Could be: (1) damaged/demagnetised badge + cold reader, (2) lost badge being used by unauthorized person, (3) reader malfunction causing false failures with no one present.',
    }
  }
  return { zone: input.zone_id, note: 'No access log data available for this zone.' }
}

function get_contractor_schedule(input: Record<string, string>): unknown {
  return {
    date: '2024-01-14 to 2024-01-15',
    shift: input.shift || 'night',
    authorized_personnel: [
      { name: 'Night Security Team (2 officers)', zones: ['all'], hours: '22:00–06:00', status: 'active' },
      { name: 'Haulage Contractor HG-442', zones: ['yard_b', 'south_service_road'], hours: '03:00–04:00', status: 'CANCELLED — cancellation logged at 16:45 same day' },
      { name: 'Emergency Maintenance On-Call', zones: ['all'], hours: 'on call only', status: 'not activated' },
    ],
    notes: 'Haulage booking for Yard B was cancelled. No other contractors authorized overnight. The south service road vehicle at 02:47 does not match any active authorization.',
  }
}

function simulate_drone_followup(input: Record<string, string>): unknown {
  const observations: Record<string, unknown> = {
    block_c: {
      zone: 'Block C',
      dispatch_time: '06:15:00',
      arrival_time: '06:17:30',
      duration_minutes: 8,
      findings: [
        'Camera CAM-C-EAST-1: unit physically intact, power indicator light OFF. Likely power fault (blown fuse or tripped breaker) rather than physical damage.',
        'East perimeter fence: no damage, no signs of climbing or cutting.',
        'Ground around east perimeter: no footprints or disturbed ground visible.',
        'Motion sensor PIR-C-EAST-2: unit intact and unobstructed. Dry leaves accumulated nearby — consistent with wind-driven false trigger.',
      ],
      overall: 'No signs of intrusion at Block C. Camera fault appears to be hardware/electrical. Motion sensor trigger consistent with wind debris.',
      confidence: 0.82,
      recommended_action: 'Log camera fault for maintenance. No security escalation required for Block C.',
    },
    yard_b: {
      zone: 'Restricted Storage Yard B',
      dispatch_time: '06:15:00',
      arrival_time: '06:19:00',
      duration_minutes: 6,
      findings: [
        'Yard B gate: closed and padlocked. No signs of forced entry.',
        'South entrance: tire tracks present consistent with a light vehicle, but tracks lead away from the gate (not toward it). Tracks appear to circle back toward the south service road.',
        'Inventory containers: all appear undisturbed from aerial view.',
      ],
      overall: 'Tire tracks are consistent with vehicle using the south service road as a shortcut or turning around, not accessing the restricted yard.',
      confidence: 0.75,
      recommended_action: 'Inconclusive from aerial alone. Ground check of Yard B gate and inventory recommended during day shift.',
    },
    access_point_7: {
      zone: 'Access Point 7',
      dispatch_time: '06:15:00',
      arrival_time: '06:16:00',
      duration_minutes: 4,
      findings: [
        'Reader AP7-READER-A: unit physically intact.',
        'No persons present in surrounding area.',
        'No signs of tampering with the reader housing.',
        'Ground: no footprints directly at the reader in soft ground nearby.',
      ],
      overall: 'No physical evidence of unauthorized access attempt. Reader fault or damaged badge the most likely explanation.',
      confidence: 0.80,
      recommended_action: 'Schedule reader maintenance inspection. Review badge ID against staff records to identify if a badge was lost.',
    },
  }

  const zone_id = input.zone_id
  const obs = observations[zone_id]
  if (obs) {
    return {
      simulation: true,
      focus: input.focus || 'general inspection',
      ...obs as object,
      waypoints: [
        { coordinates: [51.505, -0.090], timestamp: '06:15:00', note: 'Departed drone base' },
        { coordinates: SITE_ZONES.find(z => z.id === zone_id)?.center || [51.505, -0.090], timestamp: '06:17:00', note: `Arrived ${zone_id}` },
        { coordinates: [51.505, -0.090], timestamp: '06:23:00', note: 'Returned to base' },
      ],
    }
  }
  return { error: `No follow-up simulation available for zone: ${zone_id}` }
}

// ─── Tool Dispatcher ──────────────────────────────────────────────────────────

export function callTool(name: string, input: Record<string, unknown>): ToolCallResult {
  try {
    const inp = input as Record<string, string>
    let data: unknown
    switch (name) {
      case 'get_events': data = get_events(inp); break
      case 'get_zone_info': data = get_zone_info(inp); break
      case 'get_drone_patrol_log': data = get_drone_patrol_log(); break
      case 'correlate_nearby_events': data = correlate_nearby_events(inp); break
      case 'get_weather_data': data = get_weather_data(inp); break
      case 'get_access_log': data = get_access_log(inp); break
      case 'get_contractor_schedule': data = get_contractor_schedule(inp); break
      case 'simulate_drone_followup': data = simulate_drone_followup(inp); break
      default: return { success: false, data: null, error: `Unknown tool: ${name}` }
    }
    return { success: true, data }
  } catch (err) {
    return { success: false, data: null, error: String(err) }
  }
}

// OpenAI/Groq format tool definitions (used by the agent)
export const GROQ_TOOLS = TOOL_DEFINITIONS.map(t => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.inputSchema,
  },
}))
