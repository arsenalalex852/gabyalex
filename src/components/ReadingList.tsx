import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tile } from './Tile'

type Item = { id: string; title: string; read: boolean }

export default function ReadingList({ coupleId, myId }: { coupleId: string; myId: string }) {
  const [items, setItems] = useState<Item[]>([])
  const [title, setTitle] = useState('')

  async function load() {
    const { data } = await supabase.from('reading_list').select('id, title, read').order('read').order('created_at')
    setItems((data as Item[]) ?? [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!title.trim()) return
    await supabase.from('reading_list').insert({ couple_id: coupleId, title: title.trim(), added_by: myId })
    setTitle(''); await load()
  }
  async function toggle(id: string, read: boolean) {
    await supabase.from('reading_list').update({ read: !read }).eq('id', id); await load()
  }
  async function remove(id: string) {
    await supabase.from('reading_list').delete().eq('id', id); await load()
  }

  return (
    <Tile title="Reading list" accent="#7d854e">
      <div className="flex gap-2 mb-3">
        <input className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-cream text-sm outline-none focus:border-lamp"
          placeholder="add a book…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button onClick={add} className="rounded-lg bg-lamp text-[#3a1f2e] font-semibold px-3 text-sm">add</button>
      </div>
      <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
        {items.length === 0 && <span className="text-muted">no books yet 📚</span>}
        {items.map((i) => (
          <div key={i.id} className="flex items-center gap-2 text-sm">
            <button onClick={() => toggle(i.id, i.read)} className={`w-6 h-6 rounded-md border flex items-center justify-center ${i.read ? 'bg-lamp border-lamp text-[#3a1f2e]' : 'border-white/20'}`}>{i.read ? '✓' : ''}</button>
            <span className={`flex-1 ${i.read ? 'line-through text-muted' : ''}`}>{i.title}</span>
            <button onClick={() => remove(i.id)} className="text-muted hover:text-her text-xs">✕</button>
          </div>
        ))}
      </div>
    </Tile>
  )
}
