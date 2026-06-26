import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Section = 'today' | 'todo' | 'events'
type Item = { id: string; section: Section; author_id: string | null; body: string; done: boolean }
type Person = { id: string; display_name: string | null }

const SECTIONS: { key: Section; title: string }[] = [
  { key: 'today', title: 'Today' },
  { key: 'todo', title: 'To-do' },
  { key: 'events', title: 'Events' },
]

const INK = '#f0eadd'
const SERIF = "'Fraunces', Georgia, serif"
const SANS = "'Inter', system-ui, sans-serif"
const GOLD = '#e8d9b8'
const BLUE = '#7da7e8'
const RED = '#e88379'

export default function Planner({ coupleId, myId, onWall = false, stacked = false }: { coupleId: string; myId: string; onWall?: boolean; stacked?: boolean }) {
  const [items, setItems] = useState<Item[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})

  async function load() {
    const { data: profs } = await supabase.from('profiles').select('id, display_name').order('created_at')
    setPeople((profs as Person[]) ?? [])
    const { data } = await supabase.from('planner_items')
      .select('id, section, author_id, body, done').eq('couple_id', coupleId).order('created_at')
    setItems((data as Item[]) ?? [])
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  async function add(section: Section) {
    const key = `${section}`
    const body = (draft[key] ?? '').trim()
    if (!body) return
    setDraft((d) => ({ ...d, [key]: '' }))
    const { data } = await supabase.from('planner_items')
      .insert({ couple_id: coupleId, author_id: myId, section, body, done: false })
      .select('id, section, author_id, body, done').single()
    if (data) setItems((arr) => [...arr, data as Item])
  }
  async function toggle(it: Item) {
    setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
    await supabase.from('planner_items').update({ done: !it.done }).eq('id', it.id)
  }
  async function del(id: string) {
    setItems((arr) => arr.filter((x) => x.id !== id))
    await supabase.from('planner_items').delete().eq('id', id)
  }

  const ordered = [...people].sort((a, b) => (a.id === myId ? -1 : b.id === myId ? 1 : 0)).slice(0, 2)
  const colorFor = (i: number) => (i === 0 ? BLUE : RED)

  return (
    <div style={{
      height: '100%', width: '100%', boxSizing: 'border-box',
      background: 'linear-gradient(165deg, rgba(38,27,16,.93), rgba(28,19,11,.95))',
      backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      borderRadius: 16, padding: '14px 16px',
      color: INK, fontFamily: SANS, display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: onWall ? '0 10px 36px rgba(20,12,6,.45), inset 0 0 0 1px rgba(224,178,81,.14)' : 'none', overflow: 'hidden',
    }}>
      {/* date */}
      <div style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 500, color: GOLD, opacity: .85, letterSpacing: .3, marginBottom: 2 }}>
        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
      {/* header */}
      <div style={{ display: stacked ? 'none' : 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingLeft: 2 }}>
        {SECTIONS.map((s) => (
          <div key={s.key} style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: GOLD, letterSpacing: .3 }}>{s.title}</div>
        ))}
      </div>

      {ordered.map((p, idx) => {
        const mine = p.id === myId
        const color = colorFor(idx)
        const name = p.display_name ?? (mine ? 'Me' : 'Them')
        return (
          <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ fontFamily: SERIF, fontSize: 12, fontWeight: 700, color, letterSpacing: .4, marginBottom: 3 }}>{name}</div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: stacked ? '1fr' : '1fr 1fr 1fr', gap: 8, minHeight: 0, overflowY: stacked ? 'auto' : 'visible' }}>
              {SECTIONS.map((s) => {
                const list = items.filter((i) => i.section === s.key && i.author_id === p.id)
                const done = list.filter((i) => i.done).length
                const pct = list.length ? (done / list.length) * 100 : 0
                return (
                  <div key={s.key} style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: stacked ? 110 : 0,
                    background: 'rgba(255,255,255,.04)', borderRadius: 7, padding: stacked ? 10 : 6, border: '1px solid rgba(255,255,255,.06)' }}>
                    {stacked && <div style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 600, color: GOLD, marginBottom: 6 }}>{s.title}</div>}
                    <div style={{ height: 2.5, borderRadius: 3, background: 'rgba(255,255,255,.1)', overflow: 'hidden', marginBottom: 5 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, opacity: .9, transition: 'width .3s' }} />
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: stacked ? 4 : 2, minHeight: 0 }}>
                      {list.map((it) => (
                        <div key={it.id} className="pl-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: stacked ? 14 : 11, lineHeight: 1.3 }}>
                          <button onClick={() => toggle(it)} style={{
                            flexShrink: 0, width: 11, height: 11, marginTop: 1, borderRadius: 3, cursor: 'pointer', padding: 0,
                            border: `1.5px solid ${it.done ? color : 'rgba(255,255,255,.3)'}`,
                            background: it.done ? color : 'transparent', color: '#1c140a', fontSize: 8, lineHeight: '8px' }}>{it.done ? '✓' : ''}</button>
                          <span onClick={() => toggle(it)} style={{ flex: 1, cursor: 'pointer', wordBreak: 'break-word',
                            textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'rgba(236,228,211,.4)' : INK }}>{it.body}</span>
                          {mine && <button onClick={() => del(it.id)} className="pl-del" style={{ flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(236,228,211,.4)', fontSize: 11, lineHeight: 1, padding: 0 }}>×</button>}
                        </div>
                      ))}
                    </div>
                    {mine && (
                      <input value={draft[s.key] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [s.key]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && add(s.key)} placeholder="+ add"
                        style={{ marginTop: 4, width: '100%', boxSizing: 'border-box', borderRadius: 5, padding: '3px 6px',
                          border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: INK, fontFamily: SANS, fontSize: stacked ? 14 : 10.5, outline: 'none' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      <style>{`.pl-del{opacity:0;transition:opacity .15s}.pl-item:hover .pl-del{opacity:1}`}</style>
    </div>
  )
}
