import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tile } from './Tile'

type Habit = { id: string; title: string }
type Log = { habit_id: string; logged_on: string }

const today = () => new Date().toISOString().slice(0, 10)

function streakOf(habitId: string, logs: Log[]) {
  const days = new Set(logs.filter((l) => l.habit_id === habitId).map((l) => l.logged_on))
  let streak = 0
  const d = new Date()
  // count back from today while consecutive days exist
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export default function Habits({ coupleId }: { coupleId: string }) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [title, setTitle] = useState('')

  async function load() {
    const { data: h } = await supabase.from('habits').select('id, title').order('created_at')
    const { data: l } = await supabase.from('habit_logs').select('habit_id, logged_on')
    setHabits((h as Habit[]) ?? [])
    setLogs((l as Log[]) ?? [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!title.trim()) return
    await supabase.from('habits').insert({ couple_id: coupleId, title: title.trim() })
    setTitle('')
    await load()
  }

  const doneToday = (id: string) => logs.some((l) => l.habit_id === id && l.logged_on === today())

  async function toggle(id: string) {
    if (doneToday(id)) {
      await supabase.from('habit_logs').delete().eq('habit_id', id).eq('logged_on', today())
    } else {
      await supabase.from('habit_logs').insert({ habit_id: id, couple_id: coupleId, logged_on: today() })
    }
    await load()
  }
  async function remove(id: string) {
    await supabase.from('habits').delete().eq('id', id)
    await load()
  }

  return (
    <Tile title="Habits" accent="#7fd4c1">
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-cream text-sm outline-none focus:border-lamp"
          placeholder="a habit to keep together…" value={title}
          onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button onClick={add} className="rounded-lg bg-lamp text-[#3a1f2e] font-semibold px-3 text-sm">add</button>
      </div>
      <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
        {habits.length === 0 && <span className="text-muted">no habits yet</span>}
        {habits.map((h) => {
          const done = doneToday(h.id)
          const streak = streakOf(h.id, logs)
          return (
            <div key={h.id} className="flex items-center gap-2 text-sm">
              <button
                onClick={() => toggle(h.id)}
                className={`w-6 h-6 rounded-md border flex items-center justify-center ${done ? 'bg-you border-you text-[#2b2440]' : 'border-white/20'}`}
              >
                {done ? '✓' : ''}
              </button>
              <span className="flex-1">{h.title}</span>
              {streak > 0 && <span className="text-xs text-lamp">🔥 {streak}</span>}
              <button onClick={() => remove(h.id)} className="text-muted hover:text-her text-xs">✕</button>
            </div>
          )
        })}
      </div>
    </Tile>
  )
}
