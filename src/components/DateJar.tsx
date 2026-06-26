import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

type DateItem = { id: string; content: string; author_id: string | null; status: string; created_at: string }

const TERRA = '#e8638a'
const TERRA_DEEP = '#c23a63'
const ROSE = '#ef5a78'
const CREAM = '#fdeef0'
const INK = '#3a2118'
const GREEN = '#6f8a44'
const GREEN_DEEP = '#566e32'
const SERIF = "'Fraunces', Georgia, serif"
const SANS = "'Inter', system-ui, sans-serif"

export default function DateJar({ coupleId, myId }: { coupleId: string; myId: string }) {
  const { profile } = useAuth()
  const isAlex = (profile?.display_name ?? '').toLowerCase().includes('alex')
  const [jarId, setJarId] = useState<string | null>(null)
  const [items, setItems] = useState<DateItem[]>([])
  const [tab, setTab] = useState<'draw' | 'add' | 'done' | 'all'>('draw')
  const [drawn, setDrawn] = useState<DateItem | null>(null)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const avail = (i: DateItem) => !i.status || i.status === 'available'
  const available = items.filter(avail)
  const used = items.filter((i) => i.status === 'used')

  async function ensure() {
    const { data: existing } = await supabase
      .from('jars').select('id').eq('couple_id', coupleId).eq('type', 'date').maybeSingle()
    if (existing) return existing.id as string
    const { data: created } = await supabase
      .from('jars').insert({ couple_id: coupleId, type: 'date', title: 'Date jar' }).select('id').single()
    return created!.id as string
  }
  async function load(jid: string) {
    const { data } = await supabase
      .from('jar_items').select('id, content, author_id, status, created_at').eq('jar_id', jid).order('created_at', { ascending: false })
    const rows = (data as DateItem[]) ?? []
    setItems(rows)
    const mid = rows.find((r) => r.status === 'drawn')
    setDrawn(mid ?? null)
  }
  useEffect(() => { ensure().then((jid) => { setJarId(jid); load(jid) }) }, []) // eslint-disable-line

  async function draw() {
    if (busy) return
    const pool = items.filter(avail)
    if (pool.length === 0) { setDrawn(null); return }
    setBusy(true)
    const pick = pool[Math.floor(Math.random() * pool.length)]
    await supabase.from('jar_items').update({ status: 'drawn', last_drawn_at: new Date().toISOString() }).eq('id', pick.id)
    if (jarId) await load(jarId)
    setBusy(false)
  }
  async function settle(status: 'available' | 'used') {
    if (!drawn || !jarId || busy) return
    setBusy(true)
    await supabase.from('jar_items').update({ status }).eq('id', drawn.id)
    setDrawn(null)
    await load(jarId)
    setBusy(false)
  }
  async function add() {
    if (!text.trim() || saving) return
    setSaving(true)
    const jid = jarId ?? (await ensure())
    if (!jarId) setJarId(jid)
    const { error } = await supabase.from('jar_items').insert({ jar_id: jid, couple_id: coupleId, content: text.trim(), author_id: myId, status: 'available' })
    if (error) console.error('date jar add failed:', error.message)
    setText(''); await load(jid); setSaving(false); setTab('draw')
  }
  async function putBack(id: string) {
    if (!jarId) return
    await supabase.from('jar_items').update({ status: 'available' }).eq('id', id)
    await load(jarId)
  }
  async function removeDate(id: string) {
    if (!jarId) return
    await supabase.from('jar_items').delete().eq('id', id)
    await load(jarId)
  }

  return (
    <div style={{
      borderRadius: 22, overflow: 'hidden', color: INK, fontFamily: SANS,
      background: `linear-gradient(165deg, ${CREAM}, #f9d8e0)`,
      boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: `1px solid ${TERRA}44`,
    }}>
      <div style={{ position: 'relative' }}>
        <img src="/datejar.png" alt="" style={{ width: '100%', height: 132, objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(40,17,25,.55))' }} />
        <div style={{ position: 'absolute', left: 24, bottom: 12, right: 24 }}>
          <div style={{ fontFamily: SERIF, fontSize: 25, fontWeight: 600, color: '#fff', letterSpacing: .2, textShadow: '0 2px 10px rgba(0,0,0,.5)' }}>Date Jar</div>
          <div style={{ fontSize: 12, color: '#ffffffdd', marginTop: 1, textShadow: '0 1px 6px rgba(0,0,0,.5)' }}>{available.length} waiting · {used.length} done</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '14px 16px 0' }}>
        {(([['draw', 'Give me a date'], ['add', 'Add'], ['done', 'Done'], ...(isAlex ? [['all', 'All'] as const] : [])]) as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 10, border: 'none', fontFamily: SANS,
              background: tab === k ? `linear-gradient(135deg, ${TERRA}, ${TERRA_DEEP})` : 'transparent',
              color: tab === k ? CREAM : `${INK}99`, transition: 'all .15s',
            }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 24, minHeight: 300, display: 'flex', flexDirection: 'column' }}>
        {tab === 'draw' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, flex: 1, justifyContent: 'center' }}>
            {!drawn && (
              <>
                <img src="/love-letter.gif" alt="" style={{ width: 150, height: 150, objectFit: 'contain', borderRadius: 18, mixBlendMode: 'multiply' }} />
                {available.length > 0 ? (
                  <button onClick={draw} disabled={busy} style={{ ...btnSolid, opacity: busy ? .6 : 1 }}>
                    {busy ? 'reaching in…' : 'pull a date'}
                  </button>
                ) : (
                  <p style={{ fontSize: 14, color: `${INK}99`, textAlign: 'center', margin: 0, fontFamily: SERIF }}>
                    the jar is empty — add a few ideas first
                  </p>
                )}
              </>
            )}
            {drawn && (
              <>
                <div style={{
                  width: '100%', background: '#fff', borderRadius: 16, padding: '28px 22px', textAlign: 'center',
                  fontFamily: SERIF, fontSize: 21, fontWeight: 500, lineHeight: 1.4, color: INK, animation: 'rise .4s ease',
                  border: `2px dashed ${ROSE}`, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                }}>
                  <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: TERRA, marginBottom: 12, fontFamily: SANS, fontWeight: 600 }}>your date</div>
                  {drawn.content}
                </div>
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  <button onClick={() => settle('available')} disabled={busy} style={btnGhost}>return to jar</button>
                  <button onClick={() => settle('used')} disabled={busy} style={btnSolidGreen}>we did it</button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <label style={{ fontSize: 12.5, color: `${INK}99`, fontWeight: 600 }}>A date idea</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} autoFocus
              style={{
                width: '100%', resize: 'vertical', borderRadius: 14, padding: 16, fontFamily: SERIF,
                fontSize: 16, lineHeight: 1.5, color: INK, background: '#fff', border: `1px solid ${TERRA}33`,
                outline: 'none', boxSizing: 'border-box', flex: 1,
              }} />
            <button onClick={add} disabled={!text.trim() || saving} style={{ ...btnSolid, opacity: !text.trim() || saving ? .5 : 1 }}>
              {saving ? 'adding…' : 'drop in the jar'}
            </button>
          </div>
        )}

        {tab === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {used.length === 0 && <p style={{ fontSize: 14, color: `${INK}99`, fontFamily: SERIF }}>no dates marked done yet.</p>}
            {used.map((d) => (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                background: '#00000008', borderRadius: 12, padding: '12px 14px', fontSize: 14.5, border: `1px solid ${TERRA}22`,
              }}>
                <span style={{ color: `${INK}cc`, fontFamily: SERIF }}>{d.content}</span>
                <button onClick={() => putBack(d.id)} style={tinyBtn} title="put back in the jar">put back</button>
              </div>
            ))}
          </div>
        )}
        {tab === 'all' && isAlex && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            <p style={{ fontSize: 12, color: `${INK}99`, fontFamily: SANS, margin: '0 0 2px' }}>every date · {items.length} total</p>
            {items.length === 0 && <p style={{ fontSize: 14, color: `${INK}99`, fontFamily: SERIF }}>the jar is empty.</p>}
            {items.map((d) => {
              const tag = d.status === 'used' ? 'done' : d.status === 'drawn' ? 'drawn' : 'in jar'
              return (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  background: '#00000008', borderRadius: 12, padding: '10px 14px', fontSize: 14.5, border: `1px solid ${TERRA}22`,
                }}>
                  <span style={{ color: `${INK}cc`, fontFamily: SERIF, flex: 1 }}>{d.content}</span>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: .5, color: `${INK}77`, fontFamily: SANS }}>{tag}</span>
                  <button onClick={() => removeDate(d.id)} style={{ ...tinyBtn, color: TERRA_DEEP }} title="delete permanently">delete</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const btnSolid: React.CSSProperties = { padding: '14px 28px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14.5, fontFamily: SANS, color: CREAM, background: `linear-gradient(135deg, ${TERRA}, ${TERRA_DEEP})`, boxShadow: '0 4px 14px rgba(192,98,63,.35)' }
const btnSolidGreen: React.CSSProperties = { flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: SANS, color: CREAM, background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DEEP})` }
const btnGhost: React.CSSProperties = { flex: 1, padding: '13px 0', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: SANS, color: TERRA_DEEP, background: 'transparent', border: `1px solid ${TERRA}55` }
const tinyBtn: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: `${TERRA}22`, color: TERRA_DEEP, fontSize: 12, fontWeight: 600, fontFamily: SANS, whiteSpace: 'nowrap' }
