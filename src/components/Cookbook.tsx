import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Recipe = {
  id: string; title: string; category: string; serves: string; description: string
  ingredients: string[]; steps: string[]; favorite: boolean
}
type Sort = 'category' | 'title' | 'favorite'

const SERIF = "'Fraunces', Georgia, serif"
const SANS = "'Inter', system-ui, sans-serif"
const PAPER = '#f6eeda'
const INK = '#3a2a18'
const TERRA = '#b6552f'
const GOLD = '#c8893f'
const LINE = '#3a2a1820'

export default function Cookbook({ coupleId }: { coupleId: string }) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('category')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 760)
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 760)
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])

  async function load() {
    const { data } = await supabase.from('recipes')
      .select('id, title, category, serves, description, ingredients, steps, favorite')
      .eq('couple_id', coupleId)
    setRecipes((data as Recipe[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const current = recipes.find((r) => r.id === sel) ?? null

  const filtered = useMemo(() => {
    let list = [...recipes]
    if (q.trim()) {
      const s = q.toLowerCase()
      list = list.filter((r) => r.title.toLowerCase().includes(s) || r.category.toLowerCase().includes(s) || r.ingredients.some((i) => i.toLowerCase().includes(s)))
    }
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'favorite') list.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title))
    else list.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
    return list
  }, [recipes, q, sort])

  const grouped = useMemo(() => {
    if (sort !== 'category') return null
    const g: Record<string, Recipe[]> = {}
    filtered.forEach((r) => { (g[r.category] ??= []).push(r) })
    return g
  }, [filtered, sort])

  async function toggleFav(r: Recipe) {
    setRecipes((arr) => arr.map((x) => (x.id === r.id ? { ...x, favorite: !x.favorite } : x)))
    await supabase.from('recipes').update({ favorite: !r.favorite }).eq('id', r.id)
  }
  async function addNew() {
    const { data } = await supabase.from('recipes')
      .insert({ couple_id: coupleId, title: 'New recipe', category: 'Other', serves: '', description: '', ingredients: [], steps: [] })
      .select('id, title, category, serves, description, ingredients, steps, favorite').single()
    if (data) {
      setRecipes((arr) => [...arr, data as Recipe])
      setSel((data as Recipe).id)
      setDraft(data as Recipe); setEditing(true)
    }
  }
  function startEdit() { if (current) { setDraft({ ...current, ingredients: [...current.ingredients], steps: [...current.steps] }); setEditing(true) } }
  async function saveEdit() {
    if (!draft) return
    const clean = { ...draft, ingredients: draft.ingredients.filter((s) => s.trim()), steps: draft.steps.filter((s) => s.trim()) }
    setRecipes((arr) => arr.map((x) => (x.id === clean.id ? clean : x)))
    setEditing(false)
    await supabase.from('recipes').update({
      title: clean.title, category: clean.category, serves: clean.serves, description: clean.description,
      ingredients: clean.ingredients, steps: clean.steps, updated_at: new Date().toISOString(),
    }).eq('id', clean.id)
  }
  async function del(id: string) {
    setRecipes((arr) => arr.filter((x) => x.id !== id)); setSel(null); setEditing(false)
    await supabase.from('recipes').delete().eq('id', id)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', minHeight: 480, maxHeight: '82vh',
      background: PAPER, borderRadius: 18, overflow: 'hidden', fontFamily: SANS, color: INK, boxShadow: '0 24px 60px rgba(0,0,0,.5)' }}>

      <div style={{ flex: '1 1 260px', minWidth: 0, borderRight: isMobile ? 'none' : `1px solid ${LINE}`, display: (isMobile && current) ? 'none' : 'flex', flexDirection: 'column', maxHeight: '82vh', width: isMobile ? '100%' : undefined }}>
        <div style={{ padding: '18px 18px 10px' }}>
          <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, color: TERRA }}>Our cookbook</div>
          <div style={{ fontSize: 12.5, color: `${INK}99`, marginTop: 2 }}>{recipes.length} recipes</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search recipes or ingredients…"
            style={{ marginTop: 12, width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: '9px 12px', border: `1px solid ${LINE}`, background: '#fff8ec', fontSize: 13.5, outline: 'none', color: INK }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {([['category', 'By type'], ['title', 'A–Z'], ['favorite', 'Favorites']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setSort(k)} style={{
                fontSize: 12, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', border: 'none',
                background: sort === k ? GOLD : '#0000000d', color: sort === k ? '#fff' : `${INK}bb`, fontWeight: 600,
              }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 10px' }}>
          {loading && <div style={{ padding: 16, color: `${INK}88`, fontSize: 13 }}>loading…</div>}
          {!loading && filtered.length === 0 && <div style={{ padding: 16, color: `${INK}88`, fontSize: 13 }}>no recipes found</div>}

          {grouped
            ? Object.keys(grouped).sort().map((cat) => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: GOLD, fontWeight: 700, padding: '8px 8px 4px' }}>{cat}</div>
                {grouped[cat].map((r) => <Row key={r.id} r={r} sel={sel} setSel={setSel} setEditing={setEditing} toggleFav={toggleFav} />)}
              </div>
            ))
            : filtered.map((r) => <Row key={r.id} r={r} sel={sel} setSel={setSel} setEditing={setEditing} toggleFav={toggleFav} />)}
        </div>

        <div style={{ padding: 12, borderTop: `1px solid ${LINE}` }}>
          <button onClick={addNew} style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: TERRA, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>+ Add a recipe</button>
        </div>
      </div>

      <div style={{ flex: '2 1 380px', minWidth: 0, overflowY: 'auto', maxHeight: '82vh', padding: 24, display: (isMobile && !current) ? 'none' : 'block', width: isMobile ? '100%' : undefined }}>
        {isMobile && current && (
          <button onClick={() => { setSel(null); setEditing(false) }}
            style={{ background: 'none', border: 'none', color: TERRA, fontWeight: 600, fontSize: 15, cursor: 'pointer', padding: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            ‹ All recipes
          </button>
        )}
        {!isMobile && !current && <div style={{ color: `${INK}88`, fontFamily: SERIF, fontSize: 16, marginTop: 40, textAlign: 'center' }}>pick a recipe, or add a new one</div>}

        {current && !editing && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: GOLD, fontWeight: 700 }}>{current.category}</div>
                <h2 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, color: TERRA, margin: '4px 0 2px', lineHeight: 1.1 }}>{current.title}</h2>
                {current.serves && <div style={{ fontSize: 13, color: `${INK}aa` }}>{current.serves}</div>}
              </div>
              <button onClick={() => toggleFav(current)} title="favourite" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: current.favorite ? TERRA : `${INK}33`, lineHeight: 1 }}>{current.favorite ? '♥' : '♡'}</button>
            </div>
            {current.description && <p style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 1.55, color: `${INK}cc`, fontStyle: 'italic', margin: '12px 0' }}>{current.description}</p>}

            <h3 style={hd}>Ingredients</h3>
            <ul style={{ margin: '0 0 18px', padding: 0, listStyle: 'none' }}>
              {current.ingredients.map((ing, i) => (
                <li key={i} style={{ display: 'flex', gap: 9, padding: '5px 0', borderBottom: `1px solid ${LINE}`, fontSize: 14.5, lineHeight: 1.4 }}>
                  <span style={{ color: GOLD }}>•</span>{ing}
                </li>
              ))}
              {current.ingredients.length === 0 && <li style={{ color: `${INK}66`, fontSize: 13 }}>no ingredients yet — edit to add</li>}
            </ul>

            <h3 style={hd}>Method</h3>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {current.steps.map((st, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', fontSize: 14.5, lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 99, background: GOLD, color: '#fff', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                  <span>{st}</span>
                </li>
              ))}
              {current.steps.length === 0 && <li style={{ color: `${INK}66`, fontSize: 13 }}>no steps yet — edit to add</li>}
            </ol>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={startEdit} style={{ ...btn, background: GOLD }}>Edit</button>
              <button onClick={() => del(current.id)} style={{ ...btn, background: 'none', color: TERRA, border: `1px solid ${TERRA}55` }}>Delete</button>
            </div>
          </div>
        )}

        {current && editing && draft && (
          <Editor draft={draft} setDraft={setDraft} onSave={saveEdit} onCancel={() => setEditing(false)} />
        )}
      </div>
    </div>
  )
}

function Row({ r, sel, setSel, setEditing, toggleFav }: any) {
  return (
    <div onClick={() => { setSel(r.id); setEditing(false) }} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 9, cursor: 'pointer',
      background: sel === r.id ? '#00000010' : 'transparent',
    }}>
      <span onClick={(e) => { e.stopPropagation(); toggleFav(r) }} style={{ fontSize: 14, color: r.favorite ? TERRA : `${INK}33`, cursor: 'pointer' }}>{r.favorite ? '♥' : '♡'}</span>
      <span style={{ fontSize: 14, color: INK, fontWeight: sel === r.id ? 600 : 400 }}>{r.title}</span>
    </div>
  )
}

function Editor({ draft, setDraft, onSave, onCancel }: { draft: Recipe; setDraft: (r: Recipe) => void; onSave: () => void; onCancel: () => void }) {
  const set = (patch: Partial<Recipe>) => setDraft({ ...draft, ...patch })
  const setLine = (key: 'ingredients' | 'steps', i: number, v: string) => { const a = [...draft[key]]; a[i] = v; set({ [key]: a } as any) }
  const addLine = (key: 'ingredients' | 'steps') => set({ [key]: [...draft[key], ''] } as any)
  const delLine = (key: 'ingredients' | 'steps', i: number) => set({ [key]: draft[key].filter((_, j) => j !== i) } as any)
  const moveLine = (key: 'ingredients' | 'steps', i: number, dir: -1 | 1) => {
    const a = [...draft[key]]; const j = i + dir; if (j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]; set({ [key]: a } as any)
  }
  return (
    <div>
      <input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Recipe name"
        style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: TERRA, width: '100%', boxSizing: 'border-box', border: 'none', borderBottom: `2px solid ${GOLD}55`, background: 'none', outline: 'none', padding: '2px 0 6px' }} />
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <input value={draft.category} onChange={(e) => set({ category: e.target.value })} placeholder="Category" style={inp} />
        <input value={draft.serves} onChange={(e) => set({ serves: e.target.value })} placeholder="Serves / time" style={inp} />
      </div>
      <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="A short description (optional)"
        rows={2} style={{ ...inp, width: '100%', marginTop: 10, resize: 'vertical', fontFamily: SERIF }} />

      <h3 style={hd}>Ingredients</h3>
      {draft.ingredients.map((ing, i) => (
        <LineRow key={i} value={ing} onChange={(v: string) => setLine('ingredients', i, v)} onDel={() => delLine('ingredients', i)} onUp={() => moveLine('ingredients', i, -1)} onDown={() => moveLine('ingredients', i, 1)} placeholder="e.g. 2 cloves garlic, minced" />
      ))}
      <button onClick={() => addLine('ingredients')} style={addBtn}>+ ingredient</button>

      <h3 style={hd}>Method</h3>
      {draft.steps.map((st, i) => (
        <LineRow key={i} value={st} onChange={(v: string) => setLine('steps', i, v)} onDel={() => delLine('steps', i)} onUp={() => moveLine('steps', i, -1)} onDown={() => moveLine('steps', i, 1)} num={i + 1} placeholder="Describe this step…" multiline />
      ))}
      <button onClick={() => addLine('steps')} style={addBtn}>+ step</button>

      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <button onClick={onSave} style={{ ...btn, background: TERRA }}>Save</button>
        <button onClick={onCancel} style={{ ...btn, background: 'none', color: INK, border: `1px solid ${LINE}` }}>Cancel</button>
      </div>
    </div>
  )
}

function LineRow({ value, onChange, onDel, onUp, onDown, num, placeholder, multiline }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
      {num && <span style={{ flexShrink: 0, width: 22, height: 22, marginTop: 6, borderRadius: 99, background: GOLD, color: '#fff', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{num}</span>}
      {multiline
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} style={{ ...inp, flex: 1, resize: 'vertical', fontFamily: SANS }} />
        : <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...inp, flex: 1 }} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button onClick={onUp} style={miniBtn} title="move up">↑</button>
        <button onClick={onDown} style={miniBtn} title="move down">↓</button>
      </div>
      <button onClick={onDel} style={{ ...miniBtn, color: TERRA }} title="remove">✕</button>
    </div>
  )
}

const hd: React.CSSProperties = { fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: INK, margin: '20px 0 8px', borderBottom: `2px solid ${GOLD}44`, paddingBottom: 4 }
const btn: React.CSSProperties = { padding: '11px 22px', borderRadius: 11, border: 'none', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: SANS }
const inp: React.CSSProperties = { borderRadius: 8, padding: '8px 11px', border: `1px solid ${LINE}`, background: '#fff8ec', fontSize: 14, outline: 'none', color: INK, fontFamily: SANS, boxSizing: 'border-box' }
const addBtn: React.CSSProperties = { marginTop: 4, padding: '7px 14px', borderRadius: 8, border: `1px dashed ${GOLD}88`, background: 'none', color: GOLD, fontWeight: 600, fontSize: 13, cursor: 'pointer' }
const miniBtn: React.CSSProperties = { width: 22, height: 20, borderRadius: 6, border: 'none', background: '#0000000d', color: INK, fontSize: 11, cursor: 'pointer', lineHeight: 1, padding: 0 }
