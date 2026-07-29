import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

type Status = 'not_started' | 'in_progress' | 'submitted'
type Priority = 'high' | 'medium' | 'low'
type School = {
  id: string; name: string; status: Status; notes: string; position: number; priority: Priority
  location: string; mcat_median: string; gpa_median: string; deadline: string | null
}
type Essay = { id: string; school_id: string; prompt: string; response: string; word_limit: number | null; done: boolean; position: number }

const SANS = "'Inter', system-ui, sans-serif"
const BG_APP = '#f6f7fb'
const BG_CARD = '#ffffff'
const BORDER = '#e4e7ef'
const TEXT = '#1a1f36'
const MUTED = '#6b7280'
const ACCENT = '#5850ec'
const ACCENT_SOFT = '#efeeff'
const DRAG_THRESHOLD = 6

const STATUS: Record<Status, { label: string; fg: string; bg: string }> = {
  not_started: { label: 'Not started', fg: '#6b7280', bg: '#eef0f3' },
  in_progress: { label: 'In progress', fg: '#9a6b00', bg: '#fdf2d9' },
  submitted:   { label: 'Submitted',   fg: '#0f7a54', bg: '#e2f6ee' },
}
const PRIORITY: Record<Priority, { label: string }> = {
  high: { label: 'High priority' }, medium: { label: 'Medium priority' }, low: { label: 'Low priority' },
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}
function deadlineBadge(dateStr: string | null) {
  const days = daysUntil(dateStr)
  if (days === null) return null
  if (days < 0) return { text: 'Past due', fg: '#8a8f98', bg: '#eef0f3' }
  if (days <= 7) return { text: `${days}d left`, fg: '#b0392c', bg: '#fde9e6' }
  if (days <= 21) return { text: `${days}d left`, fg: '#9a6b00', bg: '#fdf2d9' }
  return { text: new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), fg: MUTED, bg: '#eef0f3' }
}

export default function Secondaries({ coupleId, onClose }: { coupleId: string; myId: string; onClose: () => void }) {
  const [schools, setSchools] = useState<School[]>([])
  const [essays, setEssays] = useState<Essay[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  // press-then-threshold drag detection (fixes unreliable click-vs-drag)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<Priority | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const pressRef = useRef<{ id: string; x: number; y: number; dragging: boolean } | null>(null)
  const overColRef = useRef<Priority | null>(null)
  const overIdRef = useRef<string | null>(null)

  async function load() {
    const { data: sc } = await supabase.from('sec_schools')
      .select('id, name, status, notes, position, priority, location, mcat_median, gpa_median, deadline')
      .eq('couple_id', coupleId).order('position')
    const { data: es } = await supabase.from('sec_essays').select('id, school_id, prompt, response, word_limit, done, position').eq('couple_id', coupleId).order('position')
    setSchools((sc as School[]) ?? []); setEssays((es as Essay[]) ?? []); setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const current = schools.find((s) => s.id === sel) ?? null
  const schoolEssays = essays.filter((e) => e.school_id === sel).sort((a, b) => a.position - b.position)

  const progress = useMemo(() => {
    if (schools.length === 0) return 0
    let total = 0
    for (const s of schools) {
      if (s.status === 'submitted') { total += 1; continue }
      const es = essays.filter((e) => e.school_id === s.id)
      if (es.length === 0) total += s.status === 'in_progress' ? 0.1 : 0
      else total += (es.filter((e) => e.done).length / es.length) * 0.9
    }
    return Math.round((total / schools.length) * 100)
  }, [schools, essays])

  const statusCounts = useMemo(() => {
    const c = { not_started: 0, in_progress: 0, submitted: 0 }
    schools.forEach((s) => { c[s.status]++ })
    return c
  }, [schools])

  const filtered = useMemo(() => {
    if (!query.trim()) return schools
    const q = query.toLowerCase()
    return schools.filter((s) => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q))
  }, [schools, query])

  const columns: Record<Priority, School[]> = { high: [], medium: [], low: [] }
  filtered.forEach((s) => columns[s.priority]?.push(s))
  ;(Object.keys(columns) as Priority[]).forEach((k) => columns[k].sort((a, b) => a.position - b.position))

  async function addSchool(pr: Priority) {
    const pos = columns[pr].length ? Math.max(...columns[pr].map((s) => s.position)) + 1 : 1
    const { data } = await supabase.from('sec_schools')
      .insert({ couple_id: coupleId, name: 'New school', status: 'not_started', priority: pr, position: pos, location: '', mcat_median: '', gpa_median: '' })
      .select('id, name, status, notes, position, priority, location, mcat_median, gpa_median, deadline').single()
    if (data) { setSchools((a) => [...a, data as School]); setSel((data as School).id) }
  }
  async function updSchool(id: string, patch: Partial<School>) {
    setSchools((a) => a.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    await supabase.from('sec_schools').update(patch).eq('id', id)
  }
  async function delSchool(id: string) {
    setSchools((a) => a.filter((s) => s.id !== id)); setEssays((a) => a.filter((e) => e.school_id !== id)); setSel(null)
    await supabase.from('sec_schools').delete().eq('id', id)
  }
  async function addEssay() {
    if (!sel) return
    const pos = schoolEssays.length ? Math.max(...schoolEssays.map((e) => e.position)) + 1 : 1
    const { data } = await supabase.from('sec_essays').insert({ couple_id: coupleId, school_id: sel, prompt: '', response: '', done: false, position: pos })
      .select('id, school_id, prompt, response, word_limit, done, position').single()
    if (data) setEssays((a) => [...a, data as Essay])
  }
  function updEssayLocal(id: string, patch: Partial<Essay>) { setEssays((a) => a.map((e) => (e.id === id ? { ...e, ...patch } : e))) }
  async function saveEssay(id: string, patch: Partial<Essay>) { updEssayLocal(id, patch); await supabase.from('sec_essays').update(patch).eq('id', id) }
  async function delEssay(id: string) { setEssays((a) => a.filter((e) => e.id !== id)); await supabase.from('sec_essays').delete().eq('id', id) }

  // ---- press -> (maybe) drag, with a movement threshold so a plain tap always opens the school ----
  function onCardPointerDown(id: string, e: React.PointerEvent) {
    pressRef.current = { id, x: e.clientX, y: e.clientY, dragging: false }
  }
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const press = pressRef.current
      if (!press) return
      const dx = e.clientX - press.x, dy = e.clientY - press.y
      if (!press.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        press.dragging = true
        const s = schools.find((x) => x.id === press.id)
        const startCol = s ? s.priority : null
        overColRef.current = startCol; overIdRef.current = press.id
        setDragId(press.id); setOverCol(startCol); setOverId(press.id)
      }
      if (press.dragging) {
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const col = el?.closest('[data-col]') as HTMLElement | null
        if (col?.dataset.col) { overColRef.current = col.dataset.col as Priority; setOverCol(overColRef.current) }
        const card = el?.closest('[data-card]') as HTMLElement | null
        overIdRef.current = card?.dataset.card ?? null; setOverId(overIdRef.current)
      }
    }
    function onUp() {
      const press = pressRef.current
      pressRef.current = null
      if (press && press.dragging) {
        commitDrop(press.id, overColRef.current, overIdRef.current)
      } else if (press) {
        setSel(press.id)
      }
      overColRef.current = null; overIdRef.current = null
      setDragId(null); setOverCol(null); setOverId(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [schools]) // eslint-disable-line

  async function commitDrop(id: string, col: Priority | null, overCard: string | null) {
    if (!col) return
    const target = [...columns[col]].filter((s) => s.id !== id)
    let idx = overCard ? target.findIndex((s) => s.id === overCard) : target.length
    if (idx < 0) idx = target.length
    const moved = schools.find((s) => s.id === id); if (!moved) return
    target.splice(idx, 0, { ...moved, priority: col })
    const updates = target.map((s, i) => ({ id: s.id, priority: col, position: i + 1 }))
    setSchools((arr) => arr.map((s) => {
      const u = updates.find((u) => u.id === s.id)
      return u ? { ...s, priority: u.priority, position: u.position } : s
    }))
    for (const u of updates) await supabase.from('sec_schools').update({ priority: u.priority, position: u.position }).eq('id', u.id)
  }

  const total = schools.length || 1

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: BG_APP, display: 'flex', flexDirection: 'column', fontFamily: SANS, color: TEXT }}>
      <div style={{ flexShrink: 0, background: BG_CARD, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16 }}>
          {current ? (
            <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', color: ACCENT, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>‹ Board</button>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: MUTED }}>Secondaries</span>
          )}

          {!current && (
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search schools or locations…"
              style={{ width: 220, fontSize: 13.5, padding: '7px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, outline: 'none', background: '#fafbfd', color: TEXT }} />
          )}

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 360 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 6, background: '#eceef4', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: ACCENT, borderRadius: 6, transition: 'width .4s' }} />
            </div>
            <span style={{ fontSize: 12.5, color: MUTED, whiteSpace: 'nowrap' }}>{progress}% overall</span>
          </div>

          <button onClick={onClose} style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`, background: BG_CARD, color: MUTED, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {!current && (
          <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1, display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', maxWidth: 480 }}>
              <div style={{ width: `${(statusCounts.not_started / total) * 100}%`, background: STATUS.not_started.fg }} />
              <div style={{ width: `${(statusCounts.in_progress / total) * 100}%`, background: STATUS.in_progress.fg }} />
              <div style={{ width: `${(statusCounts.submitted / total) * 100}%`, background: STATUS.submitted.fg }} />
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: MUTED }}>
              <span><b style={{ color: TEXT }}>{statusCounts.not_started}</b> not started</span>
              <span><b style={{ color: TEXT }}>{statusCounts.in_progress}</b> in progress</span>
              <span><b style={{ color: TEXT }}>{statusCounts.submitted}</b> submitted</span>
            </div>
          </div>
        )}
      </div>

      {!current && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 16, padding: 20, overflowX: 'auto' }}>
          {(Object.keys(columns) as Priority[]).map((pr) => (
            <div key={pr} data-col={pr} style={{ flex: '1 1 320px', minWidth: 300, maxWidth: 420, display: 'flex', flexDirection: 'column', background: overCol === pr && dragId ? ACCENT_SOFT : 'transparent', borderRadius: 14, transition: 'background .12s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 12px' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{PRIORITY[pr].label}</span>
                <span style={{ fontSize: 11.5, color: MUTED, background: '#eceef4', borderRadius: 99, padding: '1px 8px' }}>{columns[pr].length}</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '0 2px 8px' }}>
                {columns[pr].map((s) => {
                  const es = essays.filter((e) => e.school_id === s.id)
                  const doneN = es.filter((e) => e.done).length
                  const badge = deadlineBadge(s.deadline)
                  const stats = [s.location, s.mcat_median && `MCAT ${s.mcat_median}`, s.gpa_median && `GPA ${s.gpa_median}`].filter(Boolean).join(' · ')
                  return (
                    <div key={s.id} data-card={s.id}
                      onPointerDown={(e) => onCardPointerDown(s.id, e)}
                      style={{
                        background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px', cursor: 'grab',
                        opacity: dragId === s.id ? 0.35 : 1, boxShadow: '0 1px 2px rgba(20,20,43,.04)',
                        outline: overId === s.id && dragId && dragId !== s.id ? `2px solid ${ACCENT}` : 'none',
                        touchAction: 'none', userSelect: 'none',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{s.name}</div>
                        {badge && <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: badge.fg, background: badge.bg, borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' }}>{badge.text}</span>}
                      </div>
                      {stats && <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{stats}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: STATUS[s.status].fg, background: STATUS[s.status].bg, borderRadius: 6, padding: '3px 7px' }}>{STATUS[s.status].label}</span>
                        {es.length > 0 && <span style={{ fontSize: 11.5, color: MUTED }}>{doneN}/{es.length} essays</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => addSchool(pr)} style={{ margin: '4px 2px 0', padding: '9px 0', borderRadius: 10, border: `1px dashed ${BORDER}`, background: 'none', color: MUTED, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Add school</button>
            </div>
          ))}
        </div>
      )}

      {current && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>
            <input value={current.name} onChange={(e) => updSchool(current.id, { name: e.target.value })} placeholder="School name"
              style={{ fontFamily: SANS, fontSize: 28, fontWeight: 700, color: TEXT, width: '100%', boxSizing: 'border-box', border: 'none', background: 'none', outline: 'none', padding: '2px 0 8px' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 12 }}>
              <LabeledInput label="Location" value={current.location} onChange={(v) => updSchool(current.id, { location: v })} placeholder="Miami, FL" />
              <LabeledInput label="MCAT median" value={current.mcat_median} onChange={(v) => updSchool(current.id, { mcat_median: v })} placeholder="512" />
              <LabeledInput label="GPA median" value={current.gpa_median} onChange={(v) => updSchool(current.id, { gpa_median: v })} placeholder="3.78" />
              <LabeledInput label="Deadline" value={current.deadline ?? ''} onChange={(v) => updSchool(current.id, { deadline: v || null })} type="date" />
            </div>

            <div style={{ display: 'flex', gap: 8, margin: '4px 0 8px', flexWrap: 'wrap' }}>
              {(Object.keys(STATUS) as Status[]).map((st) => (
                <button key={st} onClick={() => updSchool(current.id, { status: st })} style={{
                  padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  border: `1px solid ${current.status === st ? ACCENT : BORDER}`,
                  background: current.status === st ? ACCENT : BG_CARD, color: current.status === st ? '#fff' : MUTED,
                }}>{STATUS[st].label}</button>
              ))}
              <span style={{ width: 1, background: BORDER, margin: '0 4px' }} />
              {(Object.keys(PRIORITY) as Priority[]).map((pr) => (
                <button key={pr} onClick={() => updSchool(current.id, { priority: pr })} style={{
                  padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  border: `1px solid ${current.priority === pr ? TEXT : BORDER}`,
                  background: current.priority === pr ? TEXT : BG_CARD, color: current.priority === pr ? '#fff' : MUTED,
                }}>{PRIORITY[pr].label}</button>
              ))}
            </div>

            {schoolEssays.map((es, i) => {
              const words = es.response.trim() ? es.response.trim().split(/\s+/).length : 0
              return (
                <div key={es.id} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.05em' }}>Essay {i + 1}</span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <label style={{ fontSize: 12.5, color: MUTED, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                        <input type="checkbox" checked={es.done} onChange={(e) => saveEssay(es.id, { done: e.target.checked })} /> done
                      </label>
                      <button onClick={() => delEssay(es.id)} style={{ border: 'none', background: 'none', color: '#b0554a', cursor: 'pointer', fontSize: 13 }}>Remove</button>
                    </div>
                  </div>
                  <textarea value={es.prompt} onChange={(e) => updEssayLocal(es.id, { prompt: e.target.value })} onBlur={() => saveEssay(es.id, { prompt: es.prompt })}
                    placeholder="Paste the prompt / question here…" rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', borderRadius: 9, padding: 12, border: `1px solid ${BORDER}`, background: '#fafbfd', fontFamily: SANS, fontSize: 14.5, fontWeight: 600, color: TEXT, outline: 'none', lineHeight: 1.5 }} />
                  <textarea value={es.response} onChange={(e) => updEssayLocal(es.id, { response: e.target.value })} onBlur={() => saveEssay(es.id, { response: es.response })}
                    placeholder="Write your response…" rows={10}
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, resize: 'vertical', borderRadius: 9, padding: 14, border: `1px solid ${BORDER}`, background: '#fafbfd', fontFamily: SANS, fontSize: 15, lineHeight: 1.65, color: TEXT, outline: 'none' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 12.5, color: MUTED }}>{words} words{es.word_limit ? ` / ${es.word_limit}` : ''}</span>
                    <input type="number" value={es.word_limit ?? ''} onChange={(e) => saveEssay(es.id, { word_limit: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="word limit" style={{ width: 100, fontSize: 12.5, padding: '5px 9px', borderRadius: 7, border: `1px solid ${BORDER}`, background: BG_CARD, outline: 'none', color: TEXT }} />
                  </div>
                </div>
              )
            })}

            <button onClick={addEssay} style={{ marginTop: 16, padding: '10px 18px', borderRadius: 10, border: `1px dashed ${BORDER}`, background: 'none', color: ACCENT, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>+ Add an essay / prompt</button>

            <textarea value={current.notes} onChange={(e) => updSchool(current.id, { notes: e.target.value })} onBlur={() => updSchool(current.id, { notes: current.notes })}
              placeholder="Notes about this school (deadlines, interview dates, thoughts…)" rows={3}
              style={{ width: '100%', boxSizing: 'border-box', marginTop: 22, resize: 'vertical', borderRadius: 10, padding: 12, border: `1px solid ${BORDER}`, background: '#fafbfd', fontFamily: SANS, fontSize: 14, color: TEXT, outline: 'none' }} />

            <button onClick={() => delSchool(current.id)} style={{ marginTop: 18, padding: '9px 16px', borderRadius: 9, border: 'none', background: 'none', color: '#b0554a', cursor: 'pointer', fontSize: 13 }}>Delete this school</button>
          </div>
        </div>
      )}

      {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>loading…</div>}
    </div>
  )
}

function LabeledInput({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: MUTED, marginBottom: 4 }}>{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type ?? 'text'}
        style={{ width: '100%', boxSizing: 'border-box', fontSize: 13.5, padding: '7px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, outline: 'none', background: '#fafbfd', color: TEXT }} />
    </div>
  )
}
