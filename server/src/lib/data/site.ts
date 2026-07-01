import type { SiteZone, DronePatrol } from '../../types'

export const SITE_ZONES: SiteZone[] = [
  {
    id: 'gate3',
    name: 'Gate 3',
    type: 'gate',
    restrictionLevel: 'controlled',
    center: [51.510, -0.078],
    coordinates: [
      [51.511, -0.080], [51.511, -0.076], [51.509, -0.076], [51.509, -0.080],
    ],
  },
  {
    id: 'block_a',
    name: 'Block A',
    type: 'block',
    restrictionLevel: 'open',
    center: [51.508, -0.096],
    coordinates: [
      [51.509, -0.098], [51.509, -0.094], [51.507, -0.094], [51.507, -0.098],
    ],
  },
  {
    id: 'block_b',
    name: 'Block B',
    type: 'block',
    restrictionLevel: 'open',
    center: [51.508, -0.089],
    coordinates: [
      [51.509, -0.091], [51.509, -0.087], [51.507, -0.087], [51.507, -0.091],
    ],
  },
  {
    id: 'block_c',
    name: 'Block C',
    type: 'block',
    restrictionLevel: 'controlled',
    center: [51.507, -0.082],
    coordinates: [
      [51.508, -0.084], [51.508, -0.080], [51.506, -0.080], [51.506, -0.084],
    ],
  },
  {
    id: 'yard_b',
    name: 'Restricted Storage Yard B',
    type: 'storage',
    restrictionLevel: 'restricted',
    center: [51.500, -0.090],
    coordinates: [
      [51.501, -0.093], [51.501, -0.087], [51.499, -0.087], [51.499, -0.093],
    ],
  },
  {
    id: 'access_point_7',
    name: 'Access Point 7',
    type: 'access_point',
    restrictionLevel: 'controlled',
    center: [51.505, -0.080],
    coordinates: [
      [51.506, -0.081], [51.506, -0.079], [51.504, -0.079], [51.504, -0.081],
    ],
  },
  {
    id: 'drone_base',
    name: 'Drone Base',
    type: 'drone_base',
    restrictionLevel: 'open',
    center: [51.505, -0.090],
    coordinates: [
      [51.506, -0.092], [51.506, -0.088], [51.504, -0.088], [51.504, -0.092],
    ],
  },
]

export const DRONE_PATROL_ALPHA: DronePatrol = {
  id: 'patrol_alpha_2024',
  name: 'Patrol Alpha',
  startTime: '2024-01-15T04:30:00',
  endTime: '2024-01-15T05:05:00',
  status: 'completed',
  waypoints: [
    { coordinates: [51.505, -0.090], timestamp: '2024-01-15T04:30:00', zone: 'drone_base', observation: 'Departed drone base, systems nominal' },
    { coordinates: [51.507, -0.086], timestamp: '2024-01-15T04:35:00', zone: 'block_c', observation: 'Block C west perimeter clear' },
    { coordinates: [51.510, -0.079], timestamp: '2024-01-15T04:43:00', zone: 'gate3', observation: 'Gate 3 — fence line visually intact, no intrusion signs. High wind observed.' },
    { coordinates: [51.508, -0.082], timestamp: '2024-01-15T04:50:00', zone: 'block_c', observation: 'Block C north and east perimeter — no anomalies detected from air. Camera unit on east wall showing power light off.' },
    { coordinates: [51.501, -0.090], timestamp: '2024-01-15T04:58:00', zone: 'yard_b', observation: 'Yard B — gate closed, no vehicle present at time of overflight. Tire tracks visible near south entrance.' },
    { coordinates: [51.505, -0.090], timestamp: '2024-01-15T05:05:00', zone: 'drone_base', observation: 'Returned to base. Mission complete.' },
  ],
}
