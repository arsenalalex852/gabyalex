import { useAuth } from '../context/AuthContext'
import Scene from '../components/Scene'

export default function Dashboard() {
  const { profile, loading } = useAuth()
  const coupleId = profile?.couple_id ?? null
  const myId = profile?.id ?? ''

  // still loading the profile — don't flash the warning prematurely
  if (loading || (profile === null)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="text-muted">
        loading…
      </div>
    )
  }

  if (!coupleId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="rounded-2xl border border-lamp/40 bg-lamp/10 text-lamp px-4 py-3 text-sm">
          Your account isn't linked to a couple yet. Run the seed step in Supabase.
        </div>
      </div>
    )
  }

  return <Scene coupleId={coupleId} myId={myId} />
}
