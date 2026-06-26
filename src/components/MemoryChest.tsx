import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

type Memory = { id: string; content: string; author_id: string | null; created_at: string; mood: string | null }

const GOLD = '#cda353'
const GOLD_DEEP = '#9a6f2c'
const PARCH = '#f4ead2'
const SERIF = "'Fraunces', Georgia, serif"
const SANS = "'Inter', system-ui, sans-serif"

const MOODS = [
  { key: 'romantic', label: 'Romantic' },
  { key: 'funny', label: 'Funny' },
  { key: 'thought', label: 'A thought' },
  { key: 'adventure', label: 'Adventure' },
  { key: 'milestone', label: 'Milestone' },
  { key: 'other', label: 'Other' },
]
const moodLabel = (k: string | null) => MOODS.find((m) => m.key === k)?.label ?? null

export default function MemoryChest({ coupleId, myId }: { coupleId: string; myId: string }) {
  const [jarId, setJarId] = useState<string | null>(null)
  const [items, setItems] = useState<Memory[]>([])
  const [tab, setTab] = useState<'open' | 'add' | 'all'>('open')
  const [drawn, setDrawn] = useState<Memory | null>(null)
  const [filter, setFilter] = useState<string>('any')
  const [text, setText] = useState('')
  const [mood, setMood] = useState('romantic')
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const lastPick = useRef<string | null>(null)

  async function ensure() {
    const { data: existing } = await supabase
      .from('jars').select('id').eq('couple_id', coupleId).eq('type', 'memory').maybeSingle()
    if (existing) return existing.id as string
    const { data: created } = await supabase
      .from('jars').insert({ couple_id: coupleId, type: 'memory', title: 'Memory chest' }).select('id').single()
    return created!.id as string
  }
  async function load(jid: string) {
    const { data } = await supabase
      .from('jar_items').select('id, content, author_id, created_at, mood').eq('jar_id', jid).order('created_at', { ascending: false })
    setItems((data as Memory[]) ?? [])
  }
  useEffect(() => { ensure().then((jid) => { setJarId(jid); load(jid) }) }, []) // eslint-disable-line

  function openOne() {
    const pool = filter === 'any' ? items : items.filter((m) => (m.mood ?? 'other') === filter)
    if (pool.length === 0) { setDrawn(null); return }
    let pick = pool[Math.floor(Math.random() * pool.length)]
    if (pool.length > 1) {
      let guard = 0
      while (pick.id === lastPick.current && guard < 8) { pick = pool[Math.floor(Math.random() * pool.length)]; guard++ }
    }
    lastPick.current = pick.id
    setDrawn(pick)
    if (jarId) supabase.from('jar_items').update({ last_drawn_at: new Date().toISOString() }).eq('id', pick.id).then()
  }

  async function add() {
    if (!text.trim() || !jarId || saving) return
    setSaving(true)
    await supabase.from('jar_items').insert({ jar_id: jarId, couple_id: coupleId, content: text.trim(), author_id: myId, mood })
    setText('')
    await load(jarId)
    setSaving(false)
    setTab('open')
  }
  async function del(id: string) {
    if (!jarId) return
    await supabase.from('jar_items').delete().eq('id', id)
    setConfirmId(null)
    if (lastPick.current === id) lastPick.current = null
    await load(jarId)
  }

  const counts: Record<string, number> = { any: items.length }
  for (const m of items) { const k = m.mood ?? 'other'; counts[k] = (counts[k] ?? 0) + 1 }

  return (
    <div style={{
      borderRadius: 22, overflow: 'hidden', color: PARCH, fontFamily: SANS,
      background: 'linear-gradient(165deg, #2c1c10, #1c1109)',
      boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: `1px solid ${GOLD_DEEP}55`,
    }}>
      <div style={{ position: 'relative' }}>
        <img src="/memory.gif" alt="" style={{ width: '100%', height: 132, objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(28,17,9,.15) 40%, rgba(28,17,9,.7))' }} />
        <div style={{ position: 'absolute', left: 24, bottom: 12, right: 24 }}>
          <div style={{ fontFamily: SERIF, fontSize: 25, fontWeight: 600, color: '#fff', letterSpacing: .2, textShadow: '0 2px 10px rgba(0,0,0,.6)' }}>Memory Chest</div>
          <div style={{ fontSize: 12, color: '#ffffffdd', marginTop: 1, textShadow: '0 1px 6px rgba(0,0,0,.6)' }}>{items.length} {items.length === 1 ? 'memory' : 'memories'} inside</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '14px 16px 0' }}>
        {([['open', 'Open'], ['add', 'Add'], ['all', 'All']] as const).map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k); if (k === 'open') setDrawn(null); setConfirmId(null) }}
            style={{
              flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 10,
              border: 'none', fontFamily: SANS, transition: 'all .15s',
              background: tab === k ? `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})` : 'transparent',
              color: tab === k ? '#2c1c10' : `${PARCH}aa`,
            }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 24, minHeight: 300, display: 'flex', flexDirection: 'column' }}>
        {tab === 'open' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, flex: 1, justifyContent: 'center' }}>
            {!drawn ? (
              items.length > 0 ? (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                    {['any', ...MOODS.map((m) => m.key)].filter((k) => k === 'any' || (counts[k] ?? 0) > 0).map((k) => (
                      <button key={k} onClick={() => setFilter(k)} style={{
                        padding: '6px 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: SANS,
                        border: `1px solid ${filter === k ? GOLD : GOLD_DEEP + '55'}`,
                        background: filter === k ? `${GOLD}22` : 'transparent', color: filter === k ? GOLD : `${PARCH}99`,
                      }}>{k === 'any' ? 'Any' : moodLabel(k)}</button>
                    ))}
                  </div>
                  <button onClick={openOne} style={btnSolid}>open a memory</button>
                </>
              ) : (
                <p style={{ fontSize: 14, color: `${PARCH}aa`, textAlign: 'center', margin: 0, fontFamily: SERIF }}>
                  nothing here yet — add your first memory
                </p>
              )
            ) : (
              <>
                <div style={{
                  width: '100%', background: PARCH, color: '#3a2a18', borderRadius: 14, padding: '26px 24px',
                  fontFamily: SERIF, fontSize: 18, fontWeight: 500, lineHeight: 1.55, animation: 'rise .45s ease',
                  boxShadow: '0 10px 26px rgba(0,0,0,.35)',
                }}>
                  {drawn.mood && <div style={{ fontSize: 10.5, letterSpacing: 1.5, textTransform: 'uppercase', color: GOLD_DEEP, marginBottom: 10, fontFamily: SANS, fontWeight: 700 }}>{moodLabel(drawn.mood)}</div>}
                  {drawn.content}
                  <div style={{ marginTop: 16, fontSize: 11.5, fontFamily: SANS, color: '#3a2a1877', textAlign: 'right' }}>
                    {new Date(drawn.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={openOne} style={btnGhost}>open another</button>
                  <button onClick={() => setDrawn(null)} style={btnGhost}>done</button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {MOODS.map((m) => (
                <button key={m.key} onClick={() => setMood(m.key)} style={{
                  padding: '7px 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: SANS,
                  border: `1px solid ${mood === m.key ? GOLD : GOLD_DEEP + '55'}`,
                  background: mood === m.key ? `${GOLD}22` : 'transparent', color: mood === m.key ? GOLD : `${PARCH}99`,
                }}>{m.label}</button>
              ))}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} autoFocus
              style={{
                width: '100%', resize: 'vertical', borderRadius: 14, padding: 16, fontFamily: SERIF,
                fontSize: 16, lineHeight: 1.55, color: '#3a2a18', background: PARCH, border: `1px solid ${GOLD_DEEP}44`,
                outline: 'none', boxSizing: 'border-box', flex: 1,
              }} />
            <button onClick={add} disabled={!text.trim() || saving}
              style={{ ...btnSolid, opacity: !text.trim() || saving ? .5 : 1 }}>
              {saving ? 'saving…' : 'place in the chest'}
            </button>
          </div>
        )}

        {tab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {items.length === 0 && <p style={{ fontSize: 14, color: `${PARCH}aa`, fontFamily: SERIF }}>no memories yet.</p>}
            {items.map((m) => (
              <div key={m.id} style={{ background: '#ffffff0c', borderRadius: 12, padding: '12px 14px', border: `1px solid ${GOLD_DEEP}22` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: SERIF, fontSize: 14.5, lineHeight: 1.45, color: PARCH }}>{m.content}</div>
                  {confirmId === m.id ? (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => del(m.id)} style={delYes}>delete</button>
                      <button onClick={() => setConfirmId(null)} style={delNo}>keep</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(m.id)} style={delBtn} title="delete">✕</button>
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: `${PARCH}66`, marginTop: 6, fontFamily: SANS, display: 'flex', gap: 8 }}>
                  {m.mood && <span style={{ color: GOLD, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', fontSize: 9.5 }}>{moodLabel(m.mood)}</span>}
                  <span>{new Date(m.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes rise { from { opacity: 0; transform: translateY(16px) scale(.97) } to { opacity: 1; transform: none } }`}</style>
    </div>
  )
}

const btnSolid: React.CSSProperties = {
  padding: '14px 30px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14.5, fontFamily: SANS,
  color: '#2c1c10', background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, boxShadow: '0 4px 14px rgba(205,163,83,.3)',
}
const btnGhost: React.CSSProperties = {
  padding: '11px 22px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 13.5, fontFamily: SANS,
  color: GOLD, background: 'transparent', border: `1px solid ${GOLD_DEEP}66`,
}
const delBtn: React.CSSProperties = { flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer', background: '#ffffff12', color: `${PARCH}88`, fontSize: 12 }
const delYes: React.CSSProperties = { padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#a83f2a', color: '#fff', fontSize: 11.5, fontWeight: 600, fontFamily: SANS }
const delNo: React.CSSProperties = { padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#ffffff18', color: PARCH, fontSize: 11.5, fontWeight: 600, fontFamily: SANS }
