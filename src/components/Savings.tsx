import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tile } from './Tile'

type Saving = { id: string; goal_name: string; target_amount: number; current_amount: number }

export default function Savings({ coupleId }: { coupleId: string }) {
  const [rows, setRows] = useState<Saving[]>([])
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')

  async function load() {
    const { data } = await supabase
      .from('savings').select('id, goal_name, target_amount, current_amount').order('created_at')
    setRows((data as Saving[]) ?? [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!name.trim()) return
    await supabase.from('savings').insert({
      couple_id: coupleId, goal_name: name.trim(), target_amount: Number(target) || 0, current_amount: 0,
    })
    setName(''); setTarget('')
    await load()
  }
  async function topUp(id: string, current: number, amount: number) {
    const next = Math.max(0, current + amount)
    setRows((r) => r.map((x) => (x.id === id ? { ...x, current_amount: next } : x)))
    await supabase.from('savings').update({ current_amount: next }).eq('id', id)
  }

  return (
    <Tile title="Savings jar" accent="#ffcaa0">
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-cream text-sm outline-none focus:border-lamp"
          placeholder="what are we saving for?" value={name} onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-20 rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-cream text-sm outline-none focus:border-lamp"
          placeholder="€ goal" value={target} onChange={(e) => setTarget(e.target.value)}
        />
        <button onClick={add} className="rounded-lg bg-lamp text-[#3a1f2e] font-semibold px-3 text-sm">add</button>
      </div>
      <div className="flex flex-col gap-3 max-h-52 overflow-y-auto">
        {rows.length === 0 && <span className="text-muted">no savings goals yet</span>}
        {rows.map((s) => {
          const pct = s.target_amount > 0 ? Math.min(100, (s.current_amount / s.target_amount) * 100) : 0
          return (
            <div key={s.id}>
              <div className="flex justify-between text-sm">
                <span>{s.goal_name}</span>
                <span className="text-muted">€{s.current_amount} / €{s.target_amount}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 mt-1 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#ffcaa0,#f4a6c0)' }} />
              </div>
              <div className="flex gap-1 mt-1">
                {[10, 25, 50].map((a) => (
                  <button key={a} onClick={() => topUp(s.id, s.current_amount, a)}
                    className="text-xs rounded-md bg-white/5 hover:bg-white/10 px-2 py-1">+€{a}</button>
                ))}
                <button onClick={() => topUp(s.id, s.current_amount, -10)}
                  className="text-xs rounded-md bg-white/5 hover:bg-white/10 px-2 py-1 ml-auto">-€10</button>
              </div>
            </div>
          )
        })}
      </div>
    </Tile>
  )
}
