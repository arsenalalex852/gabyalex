import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tile } from './Tile'

type Saving = { id: string; goal_name: string; target_amount: number; current_amount: number }

const usd = (n: number) => '$' + (n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

// smooth red -> amber -> green by fill fraction
function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t) }
function mix(c1: number[], c2: number[], t: number) { return `rgb(${lerp(c1[0],c2[0],t)},${lerp(c1[1],c2[1],t)},${lerp(c1[2],c2[2],t)})` }
function barColor(pct: number) {
  const p = Math.max(0, Math.min(100, pct)) / 100
  const red = [230,122,116], amber = [232,178,74], green = [104,178,92], deepGreen = [58,150,78]
  if (p < 0.5) { const t = p/0.5; return { from: mix(red,amber,t), to: mix([198,92,88],[210,150,60],t) } }
  const t = (p-0.5)/0.5; return { from: mix(amber,green,t), to: mix([210,150,60],deepGreen,t) }
}

export default function Savings({ coupleId }: { coupleId: string }) {
  const [rows, setRows] = useState<Saving[]>([])
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('savings').select('id, goal_name, target_amount, current_amount').eq('couple_id', coupleId).order('created_at')
    setRows((data as Saving[]) ?? [])
  }
  useEffect(() => { load() }, []) // eslint-disable-line

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
  async function del(id: string) {
    await supabase.from('savings').delete().eq('id', id)
    setConfirmId(null)
    await load()
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
          placeholder="$ goal" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal"
        />
        <button onClick={add} className="rounded-lg bg-lamp text-[#3a1f2e] font-semibold px-3 text-sm">add</button>
      </div>
      <div className="flex flex-col gap-3 max-h-52 overflow-y-auto">
        {rows.length === 0 && <span className="text-muted">no savings goals yet</span>}
        {rows.map((s) => {
          const pct = s.target_amount > 0 ? Math.min(100, (s.current_amount / s.target_amount) * 100) : 0
          const c = barColor(pct)
          return (
            <div key={s.id}>
              <div className="flex justify-between text-sm items-center">
                <span>{s.goal_name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-muted">{usd(s.current_amount)} / {usd(s.target_amount)}</span>
                  {confirmId === s.id ? (
                    <span className="flex gap-1">
                      <button onClick={() => del(s.id)} className="text-xs rounded-md bg-red-500/80 text-white px-2 py-0.5">delete</button>
                      <button onClick={() => setConfirmId(null)} className="text-xs rounded-md bg-white/10 px-2 py-0.5">keep</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmId(s.id)} className="text-xs text-muted hover:text-cream px-1" title="delete goal">✕</button>
                  )}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 mt-1 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${c.from}, ${c.to})`, transition: 'width .5s ease, background .4s' }} />
              </div>
              <div className="flex gap-1 mt-1">
                {[20, 50, 100].map((a) => (
                  <button key={a} onClick={() => topUp(s.id, s.current_amount, a)}
                    className="text-xs rounded-md bg-white/5 hover:bg-white/10 px-2 py-1">+${a}</button>
                ))}
                <button onClick={() => topUp(s.id, s.current_amount, -20)}
                  className="text-xs rounded-md bg-white/5 hover:bg-white/10 px-2 py-1 ml-auto">-$20</button>
              </div>
            </div>
          )
        })}
      </div>
    </Tile>
  )
}
