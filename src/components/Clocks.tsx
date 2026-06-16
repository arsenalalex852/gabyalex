import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tile } from './Tile'

type Person = { id: string; display_name: string | null; city_label: string | null; timezone: string | null }

const COMMON_TZ = [
  'Europe/Madrid', 'Europe/London', 'America/New_York', 'America/Chicago',
  'America/Los_Angeles', 'America/Sao_Paulo', 'Asia/Shanghai', 'Asia/Tokyo',
  'Asia/Dubai', 'Australia/Sydney', 'UTC',
]

function timeIn(tz: string | null) {
  if (!tz) return { time: '--:--', icon: '🕐' }
  try {
    const time = new Date().toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
    const h = parseInt(time.split(':')[0], 10)
    const icon = h >= 6 && h < 19 ? '☀️' : '🌙'
    return { time, icon }
  } catch {
    return { time: '--:--', icon: '🕐' }
  }
}

export default function Clocks({ myId }: { myId: string }) {
  const [people, setPeople] = useState<Person[]>([])
  const [, setNow] = useState(0)
  const [editing, setEditing] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, city_label, timezone')
      .order('created_at')
    setPeople((data as Person[]) ?? [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setInterval(() => setNow((n) => n + 1), 1000 * 20)
    return () => clearInterval(t)
  }, [])

  async function saveMine(city: string, tz: string) {
    await supabase.from('profiles').update({ city_label: city, timezone: tz }).eq('id', myId)
    await load()
  }

  return (
    <Tile title="Our clocks">
      <div className="flex gap-3">
        {people.map((p) => {
          const { time, icon } = timeIn(p.timezone)
          return (
            <div key={p.id} className="flex-1 text-center">
              <div className="text-[11px] text-muted">{p.city_label ?? p.display_name ?? '—'}</div>
              <div className="text-2xl font-bold tracking-wide">{time}</div>
              <div className="text-base">{icon}</div>
            </div>
          )
        })}
        {people.length === 0 && <span className="text-muted">no profiles yet</span>}
      </div>

      <button onClick={() => setEditing((e) => !e)} className="text-muted text-xs mt-3 hover:text-cream self-start">
        {editing ? 'close' : 'edit my city'}
      </button>

      {editing && (
        <MineEditor
          person={people.find((p) => p.id === myId)}
          onSave={saveMine}
        />
      )}
    </Tile>
  )
}

function MineEditor({ person, onSave }: { person?: Person; onSave: (c: string, t: string) => void }) {
  const [city, setCity] = useState(person?.city_label ?? '')
  const [tz, setTz] = useState(person?.timezone ?? 'UTC')
  return (
    <div className="mt-2 flex flex-col gap-2">
      <input
        className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-cream text-sm outline-none focus:border-lamp"
        placeholder="city label (e.g. Pamplona)"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />
      <select
        className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-cream text-sm outline-none focus:border-lamp"
        value={tz}
        onChange={(e) => setTz(e.target.value)}
      >
        {COMMON_TZ.map((z) => <option key={z} value={z} className="bg-dusk">{z}</option>)}
      </select>
      <button onClick={() => onSave(city, tz)} className="rounded-lg bg-lamp text-[#3a1f2e] font-semibold py-2 text-sm">
        save
      </button>
    </div>
  )
}
