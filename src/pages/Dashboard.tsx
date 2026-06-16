import { useAuth } from '../context/AuthContext'

function Tile({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur p-5">
      <h3 className="text-[11px] tracking-[1.5px] uppercase text-muted font-semibold mb-3">{title}</h3>
      <div className="text-cream/70 text-sm">{children ?? <span className="text-muted">coming soon</span>}</div>
    </div>
  )
}

export default function Dashboard() {
  const { profile, signOut } = useAuth()

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

      {!profile?.couple_id && (
        <div className="rounded-2xl border border-lamp/40 bg-lamp/10 text-lamp px-4 py-3 mb-5 text-sm">
          Your account isn't linked to a couple yet. Run <b>seed.sql</b> in Supabase to connect you and Gaby.
        </div>
      )}

      <main className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* The room will eventually span the full width here */}
        <div className="sm:col-span-2 lg:col-span-3 rounded-3xl border border-white/10 bg-black/30 backdrop-blur p-5 min-h-[180px] flex items-center justify-center text-muted">
          the room + sprites live here (built last)
        </div>

        <Tile title="Our clocks" />
        <Tile title="Date jar" />
        <Tile title="Memory jar" />
        <Tile title="Mailbox" />
        <Tile title="World map" />
        <Tile title="Goals" />
        <Tile title="Savings jar" />
        <Tile title="Habits" />
        <Tile title="Watch queue" />
        <Tile title="Brainstorm" />
      </main>
    </div>
  )
}
