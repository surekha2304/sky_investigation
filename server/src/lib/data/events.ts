import type { SiteEvent } from '../../types'

export const OVERNIGHT_EVENTS: SiteEvent[] = [
  {
    id: 'evt_001',
    timestamp: '2024-01-15T01:23:00',
    type: 'fence_alert',
    zone: 'gate3',
    title: 'Fence Vibration Alert — Gate 3',
    description: 'Perimeter fence vibration sensor triggered on northeast section near Gate 3. Duration: 4 seconds. Sensor ID: FVS-3-NE.',
    coordinates: [51.510, -0.078],
    metadata: { sensor_id: 'FVS-3-NE', duration_seconds: 4, intensity: 'moderate' },
  },
  {
    id: 'evt_002',
    timestamp: '2024-01-15T02:47:00',
    type: 'vehicle_path',
    zone: 'yard_b',
    title: 'Vehicle Path — Near Restricted Yard B',
    description: 'Vehicle tracking system logged a slow-moving vehicle (approx. 8 km/h) on the south service road adjacent to Restricted Storage Yard B. Vehicle ID not captured — tracking only.',
    coordinates: [51.500, -0.091],
    metadata: { speed_kmh: 8, direction: 'south-to-north', road: 'south_service_road' },
  },
  {
    id: 'evt_003',
    timestamp: '2024-01-15T03:15:00',
    type: 'badge_swipe_failed',
    zone: 'access_point_7',
    title: 'Failed Badge Swipe #1 — Access Point 7',
    description: 'Badge swipe attempt failed at Access Point 7. Badge ID presented: unknown/unreadable.',
    coordinates: [51.505, -0.080],
    metadata: { badge_id: 'UNKNOWN', reader_id: 'AP7-READER-A', attempt: 1 },
  },
  {
    id: 'evt_004',
    timestamp: '2024-01-15T03:16:00',
    type: 'badge_swipe_failed',
    zone: 'access_point_7',
    title: 'Failed Badge Swipe #2 — Access Point 7',
    description: 'Second consecutive badge swipe failure at Access Point 7. Same reader, 60 seconds after first attempt.',
    coordinates: [51.505, -0.080],
    metadata: { badge_id: 'UNKNOWN', reader_id: 'AP7-READER-A', attempt: 2 },
  },
  {
    id: 'evt_005',
    timestamp: '2024-01-15T03:18:00',
    type: 'badge_swipe_failed',
    zone: 'access_point_7',
    title: 'Failed Badge Swipe #3 — Access Point 7',
    description: 'Third consecutive badge swipe failure at Access Point 7. Pattern of 3 failures within 3 minutes triggered access log flag.',
    coordinates: [51.505, -0.080],
    metadata: { badge_id: 'UNKNOWN', reader_id: 'AP7-READER-A', attempt: 3, flag_triggered: true },
  },
  {
    id: 'evt_006',
    timestamp: '2024-01-15T04:30:00',
    type: 'drone_patrol',
    zone: 'drone_base',
    title: 'Drone Patrol Alpha — Launched',
    description: 'Scheduled nightly patrol drone launched from Drone Base. Route: Gate 3 → Block C → Yard B → Return. Pilot: autonomous mode.',
    coordinates: [51.505, -0.090],
    metadata: { drone_id: 'ALPHA-1', mode: 'autonomous', scheduled: true },
  },
  {
    id: 'evt_007',
    timestamp: '2024-01-15T05:10:00',
    type: 'motion_sensor',
    zone: 'block_c',
    title: 'Motion Sensor — Block C East Perimeter',
    description: 'Passive infrared motion sensor triggered on east perimeter of Block C. Duration: 2 seconds. Could be animal, wind-blown debris, or personnel.',
    coordinates: [51.507, -0.080],
    metadata: { sensor_id: 'PIR-C-EAST-2', duration_seconds: 2, confidence: 'low' },
  },
  {
    id: 'evt_008',
    timestamp: '2024-01-15T05:45:00',
    type: 'camera_fault',
    zone: 'block_c',
    title: 'Camera Feed Dropped — Block C',
    description: 'CCTV camera CAM-C-EAST-1 lost feed. System logged as equipment fault. Unknown whether hardware failure or external interference.',
    coordinates: [51.507, -0.081],
    metadata: { camera_id: 'CAM-C-EAST-1', fault_code: 'FEED_LOST', auto_recover: false },
  },
  {
    id: 'evt_009',
    timestamp: '2024-01-15T06:00:00',
    type: 'weather',
    zone: 'gate3',
    title: 'Weather Station Reading — Gate 3',
    description: 'Automated weather station near Gate 3 logged sustained wind at 43 km/h with gusts to 58 km/h. Temperature: 6°C.',
    coordinates: [51.510, -0.077],
    metadata: { wind_kmh: 43, gusts_kmh: 58, temperature_c: 6, station_id: 'WS-GATE3' },
  },
]

// Quick lookup helpers used by MCP tools
export function getEventsByZone(zoneId: string): SiteEvent[] {
  return OVERNIGHT_EVENTS.filter(e => e.zone === zoneId)
}

export function getEventsByType(type: string): SiteEvent[] {
  return OVERNIGHT_EVENTS.filter(e => e.type === type)
}

export function getEventsInTimeRange(from: string, to: string): SiteEvent[] {
  const f = new Date(from).getTime()
  const t = new Date(to).getTime()
  return OVERNIGHT_EVENTS.filter(e => {
    const ts = new Date(e.timestamp).getTime()
    return ts >= f && ts <= t
  })
}

export function getEventById(id: string): SiteEvent | undefined {
  return OVERNIGHT_EVENTS.find(e => e.id === id)
}
