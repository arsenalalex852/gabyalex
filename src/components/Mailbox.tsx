import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tile } from './Tile'

type Note = { id: string; author_id: string | null; body: string; created_at: string; read_at: string | null }

export default function Mailbox({ coupleId, myId }: { coupleId: string; myId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')

  async function load() {
    const { data } = await supabase
      .from('notes').select('id, author_id, body, created_at, read_at')
      .order('created_at', { ascending: false }).limit(20)
    const rows = (data as Note[]) ?? []
    setNotes(rows)
    // mark notes from the other person as read
    const unread = rows.filter((n) => n.author_id !== myId && !n.read_at).map((n) => n.id)
    if (unread.length) {
      await supabase.from('notes').update({ read_at: new Date().toISOString() }).in('id', unread)
    }
  }

  useEffect(() => { load() }, [])

  async function send() {
    if (!text.trim()) return
    await supabase.from('notes').insert({ couple_id: coupleId, author_id: myId, body: text.trim() })
    setText('')
    await load()
  }

  return (
    <Tile title="Mailbox" accent="#f4a6c0">
      <div className="relative">
        {/* faint photo of us behind the whole chat */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: -12, borderRadius: 16, overflow: 'hidden', pointerEvents: 'none',
            backgroundImage: 'url(/us.jpg)', backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.14,
          }}
        />
        <div className="relative">
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-cream text-sm outline-none focus:border-lamp backdrop-blur-sm"
              placeholder="leave a little note…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button onClick={send} className="rounded-lg bg-lamp text-[#3a1f2e] font-semibold px-3 text-sm">send</button>
          </div>
          <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
            {notes.length === 0 && <span className="text-muted">no notes yet — send the first one 💌</span>}
            {notes.map((n) => {
              const mine = n.author_id === myId
              return (
                <div
                  key={n.id}
                  className={`rounded-xl px-3 py-2 text-sm backdrop-blur-sm ${mine ? 'bg-black/25 self-end' : 'bg-her/25 self-start'}`}
                >
                  <div className="text-[10px] text-muted mb-0.5">{mine ? 'you' : 'them'}</div>
                  {n.body}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Tile>
  )
}
