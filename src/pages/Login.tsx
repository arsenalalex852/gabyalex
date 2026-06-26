import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

// Private login: type a name (alex / gaby), mapped to the real account email
// behind the scenes so Supabase Auth is satisfied. To move to real email signup
// later, restore an email field — the accounts themselves are unchanged.
const ACCOUNTS: Record<string, string> = {
  alex: 'alexanderfinnemore@gmail.com',
  gaby: 'arsenalroxfc@gmail.com',
}
const toEmail = (username: string) => ACCOUNTS[username.trim().toLowerCase()] ?? username.trim()

export default function Login() {
  const { signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!username.trim() || !password) return
    setBusy(true); setErr(null)
    const { error } = await signIn(toEmail(username), password)
    if (error) setErr(error)
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/30 backdrop-blur p-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#4a7fd6', boxShadow: '0 0 10px #4a7fd6' }} />
          <span className="w-2.5 h-2.5 rounded-full -ml-1" style={{ background: '#d6443f', boxShadow: '0 0 10px #d6443f' }} />
          <span className="text-cream font-bold tracking-wide ml-1">gabyalex</span>
        </div>
        <p className="text-muted text-sm mb-6">a little place that’s just ours.</p>

        <input
          className="w-full mb-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cream placeholder:text-muted outline-none focus:border-lamp"
          placeholder="name"
          autoCapitalize="none"
          autoCorrect="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <input
          className="w-full mb-4 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cream placeholder:text-muted outline-none focus:border-lamp"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />

        {err && <p className="text-her text-sm mb-3">{err}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-br from-lamp to-her text-[#3a1f2e] font-bold py-3 disabled:opacity-60"
        >
          {busy ? '…' : 'come in'}
        </button>
      </div>
    </div>
  )
}
