import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tile } from './Tile'

type JarItem = { id: string; content: string; author_id: string | null }

export default function Jar({
  coupleId,
  myId,
  type,
  title,
  accent,
  drawLabel,
  addPlaceholder,
}: {
  coupleId: string
  myId: string
  type: 'date' | 'memory' | 'compliment'
  title: string
  accent: string
  drawLabel: string
  addPlaceholder: string
}) {
  const [jarId, setJarId] = useState<string | null>(null)
  const [items, setItems] = useState<JarItem[]>([])
  const [drawn, setDrawn] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')

  async function ensureJar() {
    const { data: existing } = await supabase
      .from('jars').select('id').eq('couple_id', coupleId).eq('type', type).maybeSingle()
    if (existing) { setJarId(existing.id); return existing.id }
    const { data: created } = await supabase
      .from('jars').insert({ couple_id: coupleId, type, title }).select('id').single()
    setJarId(created!.id)
    return created!.id as string
  }

  async function loadItems(jid: string) {
    const { data } = await supabase
      .from('jar_items').select('id, content, author_id').eq('jar_id', jid).order('created_at')
    setItems((data as JarItem[]) ?? [])
  }

  useEffect(() => {
    ensureJar().then((jid) => loadItems(jid))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function draw() {
    if (items.length === 0) { setDrawn('add a few first 🫙'); return }
    const pick = items[Math.floor(Math.random() * items.length)]
    setDrawn(pick.content)
    if (jarId) supabase.from('jar_items').update({ last_drawn_at: new Date().toISOString() }).eq('id', pick.id).then()
  }

  async function add() {
    if (!text.trim() || !jarId) return
    await supabase.from('jar_items').insert({
      jar_id: jarId, couple_id: coupleId, content: text.trim(), author_id: myId,
    })
    setText('')
    await loadItems(jarId)
  }

  return (
    <Tile title={title} accent={accent}>
      <button
        onClick={draw}
        className="w-full rounded-xl text-[#3a1f2e] font-bold py-3 text-sm"
        style={{ background: `linear-gradient(135deg, ${accent}, #f08fb0)` }}
      >
        {drawLabel}
      </button>

      {drawn && <p className="mt-3 italic leading-snug" style={{ color: accent }}>{drawn}</p>}

      <div className="mt-3 text-xs text-muted">{items.length} in the jar</div>

      <button onClick={() => setAdding((a) => !a)} className="text-muted text-xs mt-1 hover:text-cream self-start">
        {adding ? 'close' : '+ add one'}
      </button>

      {adding && (
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-cream text-sm outline-none focus:border-lamp"
            placeholder={addPlaceholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button onClick={add} className="rounded-lg bg-lamp text-[#3a1f2e] font-semibold px-3 text-sm">add</button>
        </div>
      )}
    </Tile>
  )
}
