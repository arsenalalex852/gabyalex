import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true); setErr(null)
    const { error } =
      mode === 'in'
        ? await signIn(email, password)
        : await signUp(email, password, name)
    if (error) setErr(error)
    if (mode === 'up' && !error) setErr('Check your email to confirm, then sign in.')
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/30 backdrop-blur p-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-you shadow-[0_0_10px_#7fd4c1]" />
          <span className="w-2.5 h-2.5 rounded-full bg-her shadow-[0_0_10px_#f4a6c0] -ml-1" />
          <span className="text-cream font-bold tracking-wide ml-1">gabyalex</span>
        </div>
        <p className="text-muted text-sm mb-6">a little place that's just ours.</p>

        {mode === 'up' && (
          <input
            className="w-full mb-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cream placeholder:text-muted outline-none focus:border-lamp"
            placeholder="your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className="w-full mb-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cream placeholder:text-muted outline-none focus:border-lamp"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          {busy ? '…' : mode === 'in' ? 'come in' : 'create account'}
        </button>

        <button
          onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(null) }}
          className="w-full text-muted text-sm mt-4 hover:text-cream"
        >
          {mode === 'in' ? "first time? create an account" : 'already have one? sign in'}
        </button>
      </div>
    </div>
  )
}
