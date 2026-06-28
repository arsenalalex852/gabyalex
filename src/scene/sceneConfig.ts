// Positions are % of the WALL. Tunable in-app via "edit layout".
export const WALL_SRC = '/wall.png'
export const WALL_RATIO = 2752 / 1536

export const SHELF    = { src: '/shelf.png',    xPct: 76.3, yPct: 74.8, widthPct: 38 }
export const PAINTING = { src: '/painting-frame.png', xPct: 83.1, yPct: 36.8, widthPct: 21 }
// the painting composited inside its frame opening (% of the painting-frame image)
export const PAINTING_ART = { src: '/painting.png', xPct: 46.9, yPct: 56.4, wPct: 48.1, hPct: 51.7 }
export const TABLE    = { src: '/table.png',    xPct: 40.9, yPct: 89.4, widthPct: 30 }
export const MAP      = { src: '/map.png',      xPct: 13.7, yPct: 87.4, widthPct: 32 }
export const FRAMES   = { src: '/frames.png',   xPct: 66.9, yPct: 37.6, widthPct: 10 }

// the planner panel placed directly on the wall (no frame image)
export const PLANNER_FRAME = { src: '', xPct: 34.1, yPct: 42.9, widthPct: 52, hPct: 58 }
export const PLANNER_OPENING = { xPct: 50, yPct: 50, wPct: 100, hPct: 100 }

// The three real photos, composited into the frame windows (kept untouched).
// x/y/w/h are % of the FRAMES image box.
export type Photo = { src: string; xPct: number; yPct: number; wPct: number; hPct: number }
export const PHOTOS: Photo[] = [
  { src: '/photo1.jpg', xPct: 50.8, yPct: 26.2, wPct: 39, hPct: 13 },
  { src: '/photo2.jpg', xPct: 50.8, yPct: 55.0, wPct: 39, hPct: 13.5 },
  { src: '/photo3.jpg', xPct: 50.5, yPct: 84.0, wPct: 39, hPct: 13.5 },
]

// Clickable zones over wall objects. x/y/w/h are % of the WALL.
export type Zone = { id: string; label: string; feature: string; xPct: number; yPct: number; wPct: number; hPct: number; alexOnly?: boolean }

export const ZONES: Zone[] = [
  // shelf (right)
  { id: 'post',   label: 'Mailbox',      feature: 'mailbox',    xPct: 61.9, yPct: 73.1, wPct: 4, hPct: 16 },
  { id: 'pig',    label: 'Savings',      feature: 'savings',    xPct: 67.5, yPct: 75.8, wPct: 5, hPct: 10 },
  { id: 'date',   label: 'Date jar',     feature: 'jar:date',   xPct: 74.5, yPct: 75.0, wPct: 5, hPct: 12 },
  { id: 'memory', label: 'Memory jar',   feature: 'jar:memory', xPct: 81.6, yPct: 75.0, wPct: 6, hPct: 13 },
  // table (left)
  { id: 'books',  label: 'Reading list', feature: 'books',      xPct: 34.1, yPct: 85.9, wPct: 7, hPct: 10 },
  { id: 'camera', label: 'Watch list',   feature: 'watch',      xPct: 42.1, yPct: 83.7, wPct: 6, hPct: 11 },
  { id: 'canvas', label: 'Brainstorm',   feature: 'brainstorm', xPct: 48.5, yPct: 86.2, wPct: 5, hPct: 9 },
  // map basket (left, floor)
  { id: 'map',    label: 'World map',    feature: 'map',        xPct: 14.0, yPct: 87.9, wPct: 14, hPct: 23 },
  // Alex-only: a mango -> stretching routine (place it on a mango in edit mode)
  { id: 'stretch', label: 'Stretching',  feature: 'stretch',    xPct: 90.0, yPct: 15.0, wPct: 5, hPct: 8 },
]
