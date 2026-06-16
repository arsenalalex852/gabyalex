import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tile } from './Tile'

type Goal = { id: string; owner: string; title: string; progress: number }

export default function Goals({ coupleId }: { coupleId: string }) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState('ours')

  async function load() {
    const { data } = await supabase.from('goals').select('id, owner, title, progress').order('created_at')
    setGoals((data as Goal[]) ?? [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!title.trim()) return
    await supabase.from('goals').insert({ couple_id: coupleId, title: title.trim(), owner, progress: 0 })
    setTitle('')
    await load()
  }
  async function setProgress(id: string, progress: number) {
    setGoals((g) => g.map((x) => (x.id === id ? { ...x, progress } : x)))
    await supabase.from('goals').update({ progress }).eq('id', id)
  }
  async function remove(id: string) {
    await supabase.from('goals').delete().eq('id', id)
    await load()
  }

  const color = (o: string) => (o === 'mine' ? '#7fd4c1' : o === 'hers' ? '#f4a6c0' : '#ffcaa0')

  return (
    <Tile title="Goals">
      <div className="flex gap-2 mb-3">
        <select value={owner} onChange={(e) => setOwner(e.target.value)}
          className="rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-cream text-sm outline-none">
          <option value="mine" className="bg-dusk">mine</option>
          <option value="hers" className="bg-dusk">hers</option>
          <option value="ours" className="bg-dusk">ours</option>
        </select>
        <input
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-cream text-sm outline-none focus:border-lamp"
          placeholder="a goal…" value={title}
          onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button onClick={add} className="rounded-lg bg-lamp text-[#3a1f2e] font-semibold px-3 text-sm">add</button>
      </div>
      <div className="flex flex-col gap-3 max-h-52 overflow-y-auto">
        {goals.length === 0 && <span className="text-muted">no goals yet</span>}
        {goals.map((g) => (
          <div key={g.id}>
            <div className="flex justify-between items-center text-sm">
              <span><span style={{ color: color(g.owner) }}>●</span> {g.title}</span>
              <button onClick={() => remove(g.id)} className="text-muted hover:text-her text-xs">✕</button>
            </div>
            <input
              type="range" min={0} max={100} value={g.progress}
              onChange={(e) => setProgress(g.id, Number(e.target.value))}
              className="w-full mt-1" style={{ accentColor: color(g.owner) }}
            />
          </div>
        ))}
      </div>
    </Tile>
  )
}
