import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tile } from './Tile'

export default function Brainstorm({ coupleId }: { coupleId: string }) {
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.from('scratch').select('body').eq('couple_id', coupleId).maybeSingle()
      .then(({ data }) => { if (data?.body) setBody(data.body) })
  }, [coupleId])

  function onChange(v: string) {
    setBody(v)
    setStatus('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await supabase.from('scratch').upsert({ couple_id: coupleId, body: v, updated_at: new Date().toISOString() })
      setStatus('saved')
    }, 700)
  }

  return (
    <Tile title="Brainstorm" wide>
      <textarea
        value={body}
        onChange={(e) => onChange(e.target.value)}
        placeholder="a blank shared page — dream, plan, list, doodle in words…"
        className="w-full min-h-[120px] rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cream text-sm outline-none focus:border-lamp resize-y"
      />
      <div className="text-[11px] text-muted mt-1 h-4">
        {status === 'saving' ? 'saving…' : status === 'saved' ? 'saved ✓' : ''}
      </div>
    </Tile>
  )
}
