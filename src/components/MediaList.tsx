import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tile } from './Tile'

type Kind = 'books' | 'movies'
type Item = {
  id: string; title: string; author: string | null; genre: string | null
  owner: string | null; rating: number | null; finished: boolean
}

const CFG = {
  books: {
    table: 'reading_list', accent: '#e0b083', title: 'Reading list',
    toDo: 'To read', done: 'Read', addPh: 'book title', hasAuthor: true, hasOwner: true, markVerb: 'mark read',
    genres: ['Fiction', 'Non-fiction', 'Sci-fi', 'Fantasy', 'Mystery', 'Romance', 'History', 'Biography', 'Other'],
  },
  movies: {
    table: 'watch_queue', accent: '#b3a9cf', title: 'Watch list',
    toDo: 'To watch', done: 'Watched', addPh: 'movie or show', hasAuthor: false, hasOwner: false, markVerb: 'mark watched',
    genres: ['Action', 'Comedy', 'Drama', 'Thriller', 'Horror', 'Sci-fi', 'Romance', 'Documentary', 'Animation', 'Other'],
  },
} as const

export default function MediaList({ kind, coupleId, myName }: { kind: Kind; coupleId: string; myName: string }) {
  const c = CFG[kind]
  const [items, setItems] = useState<Item[]>([])
  const [tab, setTab] = useState<'todo' | 'done'>('todo')
  const [picked, setPicked] = useState<string | null>(null)
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [genre, setGenre] = useState('')
  const [owner, setOwner] = useState(c.hasOwner ? (myName.toLowerCase().includes('gab') ? 'gaby' : 'alex') : 'ours')
  const [showGenres, setShowGenres] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const todo = items.filter((i) => !i.finished)
  const done = items.filter((i) => i.finished)
  const byOwner = (arr: Item[]) => (!c.hasOwner || ownerFilter === 'all') ? arr : arr.filter((i) => (i.owner ?? 'ours') === ownerFilter)

  async function load() {
    const cols = c.hasAuthor ? 'id, title, author, genre, owner, rating, finished' : 'id, title, genre, rating, finished'
    const { data } = await supabase.from(c.table).select(cols).eq('couple_id', coupleId).order('created_at', { ascending: false })
    setItems(((data as any[]) ?? []).map((r) => ({ owner: null, author: null, ...r })) as Item[])
  }
  useEffect(() => { load() }, [kind]) // eslint-disable-line

  async function add() {
    if (!title.trim()) return
    const row: any = { couple_id: coupleId, title: title.trim(), genre: genre || null, finished: false }
    if (c.hasAuthor) row.author = author.trim() || null
    if (c.hasOwner) row.owner = owner
    await supabase.from(c.table).insert(row)
    setTitle(''); setAuthor(''); setGenre(''); setShowGenres(false)
    await load()
  }
  async function setRating(id: string, rating: number) {
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, rating } : i)))
    await supabase.from(c.table).update({ rating, finished: true }).eq('id', id)
  }
  async function markFinished(id: string, finished: boolean) {
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, finished } : i)))
    await supabase.from(c.table).update({ finished }).eq('id', id)
  }
  async function del(id: string) {
    await supabase.from(c.table).delete().eq('id', id); setConfirmId(null); await load()
  }

  const list = byOwner(tab === 'todo' ? todo : done)

  return (
    <Tile title={c.title} accent={c.accent}>
      {/* add row */}
      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-cream text-sm outline-none focus:border-lamp"
          placeholder={c.addPh} value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !c.hasAuthor && add()}
        />
        {c.hasAuthor && (
          <input
            className="w-28 rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-cream text-sm outline-none focus:border-lamp"
            placeholder="author" value={author} onChange={(e) => setAuthor(e.target.value)}
          />
        )}
        <button onClick={add} className="rounded-lg bg-lamp text-[#3a1f2e] font-semibold px-3 text-sm">add</button>
      </div>

      {/* genre + owner pickers for the item being added */}
      <div className="flex flex-wrap gap-1 mb-1">
        <button onClick={() => setShowGenres((s) => !s)}
          className={`text-xs rounded-full px-2.5 py-1 border ${genre ? 'border-lamp text-lamp' : 'border-white/15 text-muted'}`}>
          {genre || 'genre'} ▾
        </button>
        {c.hasOwner && ['alex', 'gaby', 'ours'].map((o) => (
          <button key={o} onClick={() => setOwner(o)}
            className={`text-xs rounded-full px-2.5 py-1 border ${owner === o ? 'border-lamp text-lamp' : 'border-white/15 text-muted'}`}>
            {o === 'ours' ? 'both' : o}
          </button>
        ))}
      </div>
      {showGenres && (
        <div className="flex flex-wrap gap-1 mb-2">
          {c.genres.map((g) => (
            <button key={g} onClick={() => { setGenre(g === genre ? '' : g); setShowGenres(false) }}
              className={`text-xs rounded-full px-2.5 py-1 ${genre === g ? 'bg-lamp text-[#3a1f2e]' : 'bg-white/5 text-muted hover:bg-white/10'}`}>{g}</button>
          ))}
        </div>
      )}

      {/* tabs */}
      <div className="flex gap-1 mb-2 mt-1">
        {([['todo', c.toDo], ['done', c.done]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`text-xs rounded-lg px-3 py-1.5 font-semibold ${tab === k ? 'bg-white/10 text-cream' : 'text-muted'}`}>{label}</button>
        ))}
        {c.hasOwner && (
          <div className="flex gap-1 ml-auto">
            {['all', 'alex', 'gaby'].map((o) => (
              <button key={o} onClick={() => setOwnerFilter(o)}
                className={`text-xs rounded-lg px-2 py-1.5 ${ownerFilter === o ? 'bg-white/10 text-cream' : 'text-muted'}`}>{o}</button>
            ))}
          </div>
        )}
        {!c.hasOwner && tab === 'todo' && (
          <button
            onClick={() => {
              const pool = byOwner(todo)
              if (!pool.length) return
              const choice = pool[Math.floor(Math.random() * pool.length)]
              setPicked(choice.id)
            }}
            className="text-xs rounded-lg px-3 py-1.5 font-semibold ml-auto"
            style={{ background: c.accent, color: '#2b2440' }}
          >surprise me</button>
        )}
      </div>

      {picked && tab === 'todo' && (() => {
        const p = items.find((x) => x.id === picked)
        if (!p) return null
        return (
          <div className="rounded-xl px-3 py-2 mb-2" style={{ background: `${c.accent}22`, border: `1px solid ${c.accent}` }}>
            <div className="text-[10px] uppercase tracking-wide" style={{ color: c.accent }}>tonight, watch</div>
            <div className="text-sm text-cream">{p.title}{p.genre ? ` · ${p.genre}` : ''}</div>
          </div>
        )
      })()}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto" style={{ maxHeight: '60vh' }}>
        {list.length === 0 && <span className="text-muted text-sm">nothing here yet</span>}
        {list.map((i) => (
          <div key={i.id} className="rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="text-sm text-cream">{i.title}</div>
                <div className="text-[11px] text-muted flex gap-2 flex-wrap mt-0.5">
                  {i.author && <span>{i.author}</span>}
                  {i.genre && <span style={{ color: c.accent }}>{i.genre}</span>}
                  {c.hasOwner && i.owner && i.owner !== 'ours' && <span className="capitalize">{i.owner}</span>}
                </div>
              </div>
              {confirmId === i.id ? (
                <span className="flex gap-1 shrink-0">
                  <button onClick={() => del(i.id)} className="text-[11px] rounded-md bg-red-500/80 text-white px-2 py-0.5">delete</button>
                  <button onClick={() => setConfirmId(null)} className="text-[11px] rounded-md bg-white/10 px-2 py-0.5">keep</button>
                </span>
              ) : (
                <button onClick={() => setConfirmId(i.id)} className="text-muted hover:text-cream text-xs shrink-0" title="delete">✕</button>
              )}
            </div>

            {tab === 'done' ? (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                <span className="text-[10px] text-muted mr-1">rating</span>
                {Array.from({ length: 10 }).map((_, n) => (
                  <button key={n} onClick={() => setRating(i.id, n + 1)}
                    className="w-5 h-5 rounded text-[10px] font-bold"
                    style={{ background: (i.rating ?? 0) >= n + 1 ? c.accent : 'rgba(255,255,255,.08)', color: (i.rating ?? 0) >= n + 1 ? '#2b2440' : '#b3a9cf' }}>
                    {n + 1}
                  </button>
                ))}
              </div>
            ) : (
              <button onClick={() => markFinished(i.id, true)} className="text-[11px] text-muted hover:text-cream mt-1.5">{c.markVerb} →</button>
            )}
          </div>
        ))}
      </div>
    </Tile>
  )
}
