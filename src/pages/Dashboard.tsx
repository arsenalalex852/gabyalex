import { useAuth } from '../context/AuthContext'
import Clocks from '../components/Clocks'
import Jar from '../components/Jar'
import Mailbox from '../components/Mailbox'
import Goals from '../components/Goals'
import Savings from '../components/Savings'
import Habits from '../components/Habits'
import WatchQueue from '../components/WatchQueue'
import Brainstorm from '../components/Brainstorm'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const coupleId = profile?.couple_id ?? null
  const myId = profile?.id ?? ''

  return (
    <div className="min-h-screen max-w-5xl mx-auto p-4 sm:p-6">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-you shadow-[0_0_10px_#7fd4c1]" />
          <span className="w-2.5 h-2.5 rounded-full bg-her shadow-[0_0_10px_#f4a6c0] -ml-1" />
          <span className="text-cream font-bold tracking-wide ml-1">gabyalex</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>hi {profile?.display_name ?? 'you'}</span>
          <button onClick={signOut} className="hover:text-cream">sign out</button>
        </div>
      </header>

      {!coupleId && (
        <div className="rounded-2xl border border-lamp/40 bg-lamp/10 text-lamp px-4 py-3 mb-5 text-sm">
          Your account isn't linked to a couple yet. Run the seed step in Supabase to connect you and Gaby.
        </div>
      )}

      {coupleId && (
        <main className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
          <div className="sm:col-span-2 lg:col-span-3 rounded-3xl border border-white/10 bg-black/30 backdrop-blur p-5 min-h-[140px] flex items-center justify-center text-muted">
            the room + sprites live here (built last)
          </div>

          <Clocks myId={myId} />
          <Jar coupleId={coupleId} myId={myId} type="date" title="Date jar" accent="#ffcaa0"
               drawLabel="🎲 draw a date" addPlaceholder="a date idea…" />
          <Jar coupleId={coupleId} myId={myId} type="memory" title="Memory jar" accent="#f4a6c0"
               drawLabel="✨ pull a memory" addPlaceholder="a sweet memory…" />
          <Jar coupleId={coupleId} myId={myId} type="compliment" title="Things I love about you" accent="#7fd4c1"
               drawLabel="💛 draw one" addPlaceholder="something you love…" />
          <Mailbox coupleId={coupleId} myId={myId} />
          <Goals coupleId={coupleId} />
          <Savings coupleId={coupleId} />
          <Habits coupleId={coupleId} />
          <WatchQueue coupleId={coupleId} myId={myId} />
          <Brainstorm coupleId={coupleId} />
        </main>
      )}
    </div>
  )
}
