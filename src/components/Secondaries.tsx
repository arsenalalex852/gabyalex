import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

type School = { id: string; name: string; status: Status; notes: string; position: number }
type Essay = { id: string; school_id: string; prompt: string; response: string; word_limit: number | null; done: boolean; position: number }
type Status = 'not_started' | 'in_progress' | 'submitted'

const SERIF = "'Fraunces', Georgia, serif"
const SANS = "'Inter', system-ui, sans-serif"
const PAPER = '#f6eeda'
const INK = '#2a2438'
const PLUM = '#5b4b8a'
const GOLD = '#d8a24a'
const GREEN = '#6f9a5f'
const LINE = '#2a243818'

const STATUS: Record<Status, { label: string; color: string }> = {
  not_started: { label: 'Not started', color: '#9a93a8' },
  in_progress: { label: 'In progress', color: GOLD },
  submitted: { label: 'Submitted', color: GREEN },
}

export default function Secondaries({ coupleId, myId }: { coupleId: string; myId: string }) {
  const [schools, setSchools] = useState<School[]>([])
  const [essays, setEssays] = useState<Essay[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 760)
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 760)
    window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR)
  }, [])

  async function load() {
    const { data: sc } = await supabase.from('sec_schools').select('id, name, status, notes, position').eq('couple_id', coupleId).order('position').order('created_at')
    const { data: es } = await supabase.from('sec_essays').select('id, school_id, prompt, response, word_limit, done, position').eq('couple_id', coupleId).order('position').order('created_at')
    setSchools((sc as School[]) ?? []); setEssays((es as Essay[]) ?? []); setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const current = schools.find((s) => s.id === sel) ?? null
  const schoolEssays = essays.filter((e) => e.school_id === sel).sort((a, b) => a.position - b.position)

  // overall progress: each school contributes; submitted = full, else fraction of essays done
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

  const submittedCount = schools.filter((s) => s.status === 'submitted').length

  async function addSchool() {
    const pos = schools.length ? Math.max(...schools.map((s) => s.position)) + 1 : 1
    const { data } = await supabase.from('sec_schools').insert({ couple_id: coupleId, name: 'New school', status: 'not_started', position: pos })
      .select('id, name, status, notes, position').single()
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
  async function saveEssay(id: string, patch: Partial<Essay>) {
    updEssayLocal(id, patch)
    await supabase.from('sec_essays').update(patch).eq('id', id)
  }
  async function delEssay(id: string) { setEssays((a) => a.filter((e) => e.id !== id)); await supabase.from('sec_essays').delete().eq('id', id) }

  return (
    <div style={{ width: '100%', minHeight: 480, maxHeight: '84vh', display: 'flex', flexDirection: 'column', background: PAPER, borderRadius: 18, overflow: 'hidden', fontFamily: SANS, color: INK, boxShadow: '0 24px 60px rgba(0,0,0,.5)' }}>
      {/* header + overall progress */}
      <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${LINE}`, background: 'linear-gradient(120deg, #efe6f5, #f6eeda)' }}>
        <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, color: PLUM }}>Secondaries — you've got this ♥</div>
        <div style={{ fontSize: 12.5, color: `${INK}aa`, marginTop: 2 }}>{submittedCount} of {schools.length} submitted</div>
        <div style={{ marginTop: 10, height: 12, borderRadius: 8, background: '#00000010', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${PLUM}, ${GOLD})`, borderRadius: 8, transition: 'width .5s' }} />
        </div>
        <div style={{ fontSize: 12, color: `${INK}99`, marginTop: 5, textAlign: 'right' }}>{progress}% done overall</div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, flexWrap: 'wrap' }}>
        {/* school list */}
        <div style={{ flex: '1 1 240px', minWidth: 0, borderRight: isMobile ? 'none' : `1px solid ${LINE}`, display: (isMobile && current) ? 'none' : 'flex', flexDirection: 'column', maxHeight: '84vh', width: isMobile ? '100%' : undefined }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {loading && <div style={{ padding: 12, color: `${INK}88`, fontSize: 13 }}>loading…</div>}
            {!loading && schools.length === 0 && <div style={{ padding: 12, color: `${INK}88`, fontSize: 13 }}>no schools yet — add your first below</div>}
            {schools.map((s) => {
              const es = essays.filter((e) => e.school_id === s.id)
              const doneN = es.filter((e) => e.done).length
              return (
                <div key={s.id} onClick={() => setSel(s.id)} style={{ padding: '11px 12px', borderRadius: 11, cursor: 'pointer', marginBottom: 6, background: sel === s.id ? '#00000010' : 'transparent', border: `1px solid ${sel === s.id ? LINE : 'transparent'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>{s.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: STATUS[s.status].color }}>{STATUS[s.status].label}</span>
                  </div>
                  {es.length > 0 && <div style={{ fontSize: 11.5, color: `${INK}88`, marginTop: 3 }}>{doneN}/{es.length} essays done</div>}
                </div>
              )
            })}
          </div>
          <div style={{ padding: 12, borderTop: `1px solid ${LINE}` }}>
            <button onClick={addSchool} style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: PLUM, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>+ Add a school</button>
          </div>
        </div>

        {/* school detail / essays */}
        <div style={{ flex: '2 1 380px', minWidth: 0, overflowY: 'auto', maxHeight: '84vh', padding: 22, display: (isMobile && !current) ? 'none' : 'block', width: isMobile ? '100%' : undefined }}>
          {isMobile && current && (
            <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', color: PLUM, fontWeight: 600, fontSize: 15, cursor: 'pointer', padding: '0 0 12px' }}>‹ All schools</button>
          )}
          {!isMobile && !current && <div style={{ color: `${INK}88`, fontFamily: SERIF, fontSize: 16, marginTop: 40, textAlign: 'center' }}>pick a school to work on its essays</div>}

          {current && (
            <div>
              <input value={current.name} onChange={(e) => updSchool(current.id, { name: e.target.value })} placeholder="School name"
                style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: PLUM, width: '100%', boxSizing: 'border-box', border: 'none', borderBottom: `2px solid ${PLUM}33`, background: 'none', outline: 'none', padding: '2px 0 6px' }} />

              <div style={{ display: 'flex', gap: 6, margin: '14px 0' }}>
                {(Object.keys(STATUS) as Status[]).map((st) => (
                  <button key={st} onClick={() => updSchool(current.id, { status: st })} style={{
                    flex: 1, padding: '8px 0', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                    border: `1px solid ${current.status === st ? STATUS[st].color : LINE}`,
                    background: current.status === st ? STATUS[st].color : 'transparent',
                    color: current.status === st ? '#fff' : `${INK}aa`,
                  }}>{STATUS[st].label}</button>
                ))}
              </div>

              {schoolEssays.map((es, i) => {
                const words = es.response.trim() ? es.response.trim().split(/\s+/).length : 0
                return (
                  <div key={es.id} style={{ background: '#fff8ec', border: `1px solid ${LINE}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: PLUM, textTransform: 'uppercase', letterSpacing: '.06em' }}>Essay {i + 1}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <label style={{ fontSize: 12, color: `${INK}99`, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <input type="checkbox" checked={es.done} onChange={(e) => saveEssay(es.id, { done: e.target.checked })} /> done
                        </label>
                        <button onClick={() => delEssay(es.id)} style={{ border: 'none', background: 'none', color: `${INK}66`, cursor: 'pointer', fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                    <textarea value={es.prompt} onChange={(e) => updEssayLocal(es.id, { prompt: e.target.value })} onBlur={() => saveEssay(es.id, { prompt: es.prompt })}
                      placeholder="Paste the prompt / question here…" rows={2}
                      style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, resize: 'vertical', borderRadius: 8, padding: 10, border: `1px solid ${LINE}`, background: '#fff', fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: INK, outline: 'none' }} />
                    <textarea value={es.response} onChange={(e) => updEssayLocal(es.id, { response: e.target.value })} onBlur={() => saveEssay(es.id, { response: es.response })}
                      placeholder="Write your response…" rows={7}
                      style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, resize: 'vertical', borderRadius: 8, padding: 11, border: `1px solid ${LINE}`, background: '#fff', fontFamily: SERIF, fontSize: 14.5, lineHeight: 1.55, color: INK, outline: 'none' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: `${INK}88` }}>{words} words{es.word_limit ? ` / ${es.word_limit}` : ''}</span>
                      <input type="number" value={es.word_limit ?? ''} onChange={(e) => saveEssay(es.id, { word_limit: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="word limit" style={{ width: 90, fontSize: 12, padding: '4px 8px', borderRadius: 7, border: `1px solid ${LINE}`, background: '#fff', outline: 'none', color: INK }} />
                    </div>
                  </div>
                )
              })}

              <button onClick={addEssay} style={{ padding: '9px 16px', borderRadius: 9, border: `1px dashed ${PLUM}77`, background: 'none', color: PLUM, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>+ Add an essay / prompt</button>

              <textarea value={current.notes} onChange={(e) => updSchool(current.id, { notes: e.target.value })} onBlur={() => updSchool(current.id, { notes: current.notes })}
                placeholder="Notes about this school (deadlines, interview dates, thoughts…)" rows={3}
                style={{ width: '100%', boxSizing: 'border-box', marginTop: 18, resize: 'vertical', borderRadius: 10, padding: 11, border: `1px solid ${LINE}`, background: '#fff8ec', fontFamily: SERIF, fontSize: 14, color: INK, outline: 'none' }} />

              <div style={{ marginTop: 16 }}>
                <button onClick={() => delSchool(current.id)} style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${STATUS.submitted.color}00`, background: 'none', color: '#b0554a', cursor: 'pointer', fontSize: 13 }}>Delete this school</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
