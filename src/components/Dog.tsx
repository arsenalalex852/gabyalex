import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// Sprite sheet: 512x432, 8 cols x 9 rows, each cell 64x48. All rows face LEFT natively.
const SHEET = '/dog.png'
const COLS = 8, ROWS = 9, CW = 64, CH = 48
const ANIM = {
  idle:  { row: 0, frames: 8, fps: 6,  faceRight: false },
  walk:  { row: 4, frames: 8, fps: 11, faceRight: false },
  run:   { row: 3, frames: 8, fps: 14, faceRight: false },
  sit:   { row: 1, frames: 8, fps: 5,  faceRight: false },
  beg:   { row: 7, frames: 8, fps: 7,  faceRight: false },
  sleep: { row: 8, frames: 4, fps: 3,  faceRight: false },
}
const SCALE = 1.6
const BALL_SRC = '/ball.png'   // drop a Gemini-made ball PNG here; falls back to a drawn ball if missing
const BALL_COLOR = '#d6443f'   // fallback colour if no image

type Pet = { name: string; last_fed: string; last_played: string; bond: number }
type Mode = 'roam' | 'chase' | 'fetch' | 'feed'
// ball physics: x/y in % of scene, vx/vy in %/tick, resting on floor when grounded
type Ball = { x: number; y: number; vx: number; vy: number; grounded: boolean; held: boolean }

export default function Dog({ coupleId, myId, myName }: { coupleId: string; myId: string; myName?: string }) {
  const [frame, setFrame] = useState(0)
  const [anim, setAnim] = useState<keyof typeof ANIM>('idle')
  const [facingLeft, setFacingLeft] = useState(false)
  const [pos, setPos] = useState({ x: 30 })
  const [panel, setPanel] = useState(false)
  const [pet, setPet] = useState<Pet | null>(null)
  const [nameDraft, setNameDraft] = useState('')

  // play state — one ball that lives on the floor
  const [armed, setArmed] = useState(false) // ball picked up, ready to aim
  const [ball, setBall] = useState<Ball>({ x: 6, y: 0, vx: 0, vy: 0, grounded: true, held: false })
  const ballRef = useRef(ball); ballRef.current = ball
  const modeRef = useRef<Mode>('roam')
  const targetRef = useRef<{ x: number; run: boolean } | null>(null)

  const animRef = useRef(anim); animRef.current = anim
  const posRef = useRef(pos.x); posRef.current = pos.x

  // ---- load + ensure pet row ----
  async function loadPet() {
    const { data } = await supabase.from('pet').select('name, last_fed, last_played, bond').eq('couple_id', coupleId).maybeSingle()
    if (data) { setPet(data as Pet); setNameDraft((data as Pet).name ?? '') }
    else {
      const { data: made } = await supabase.from('pet').insert({ couple_id: coupleId }).select('name, last_fed, last_played, bond').single()
      if (made) { setPet(made as Pet); setNameDraft((made as Pet).name ?? '') }
    }
  }
  useEffect(() => { loadPet() }, []) // eslint-disable-line

  // ---- animation ticker ----
  useEffect(() => {
    const a = ANIM[anim]
    const id = setInterval(() => setFrame((f) => (f + 1) % a.frames), 1000 / a.fps)
    return () => clearInterval(id)
  }, [anim])

  // ---- roaming brain (suspended while playing) ----
  useEffect(() => {
    let alive = true
    function decide() {
      if (!alive) return
      if (modeRef.current === 'roam') {
        const r = Math.random()
        if (r < 0.4) { const t = 8 + Math.random() * 72; targetRef.current = { x: t, run: false }; setFacingLeft(t < posRef.current); setAnim('walk') }
        else if (r < 0.5) { const t = 8 + Math.random() * 72; targetRef.current = { x: t, run: true }; setFacingLeft(t < posRef.current); setAnim('run') }
        else if (r < 0.66) { setAnim('idle'); targetRef.current = null }
        else if (r < 0.8) { setAnim('sit'); targetRef.current = null }
        else if (r < 0.9) { setAnim('beg'); targetRef.current = null }
        else { setAnim('sleep'); targetRef.current = null }
      }
      const cur = animRef.current
      const next = cur === 'sleep' ? 6000 + Math.random() * 5000 : 2400 + Math.random() * 3200
      setTimeout(decide, next)
    }
    const t = setTimeout(decide, 1500)
    return () => { alive = false; clearTimeout(t) }
  }, [])

  // ---- movement loop ----
  useEffect(() => {
    const id = setInterval(() => {
      setPos((p) => {
        // while chasing, keep aiming at the ball's live position
        if (modeRef.current === 'chase' && !ballRef.current.held) {
          targetRef.current = { x: ballRef.current.x, run: true }
        }
        const tgt = targetRef.current
        if (!tgt) return p
        const dx = tgt.x - p.x
        if (Math.abs(dx) < 1.2) {
          targetRef.current = null
          if (modeRef.current === 'chase') {
            // reached the ball: "carry" it back (ball follows dog, hidden by held flag)
            setBall((b) => ({ ...b, held: true, grounded: true, vx: 0, vy: 0 }))
            const home = 28 + Math.random() * 24
            modeRef.current = 'fetch'
            targetRef.current = { x: home, run: false }
            setFacingLeft(home < p.x); setAnim('walk')
            return p
          }
          if (modeRef.current === 'fetch') {
            // delivered: drop ball here, happy beg, bond up
            setBall((b) => ({ ...b, held: false, grounded: true, x: p.x - 4, y: 0, vx: 0, vy: 0 }))
            modeRef.current = 'roam'; setAnim('beg')
            bumpPlay()
            return p
          }
          setAnim('idle')
          return p
        }
        const speed = tgt.run ? 0.95 : 0.34
        const nx = p.x + Math.sign(dx) * speed
        // face the way we're actually moving (dx>0 = moving right)
        setFacingLeft(dx < 0)
        // if carrying the ball, it travels with the dog's mouth
        if (modeRef.current === 'fetch') setBall((b) => (b.held ? { ...b, x: nx, y: 0 } : b))
        return { x: nx }
      })
    }, 30)
    return () => clearInterval(id)
  }, []) // eslint-disable-line

  // ---- ball physics: y = height above floor (up is positive) ----
  useEffect(() => {
    const GRAV = 0.12         // pulls down each tick
    const REST = 0.45         // bounce energy kept
    const ROLL_FRICTION = 0.93
    const id = setInterval(() => {
      setBall((b) => {
        if (b.held || b.grounded) return b
        let { x, y, vx, vy } = b
        vy -= GRAV            // gravity pulls velocity downward
        x += vx
        y += vy
        if (y > 55) { y = 55; if (vy > 0) vy = 0 }   // safety ceiling (well above normal arcs)
        if (x < 3) { x = 3; vx = Math.abs(vx) * REST }
        if (x > 92) { x = 92; vx = -Math.abs(vx) * REST }
        if (y <= 0) {            // hit the floor
          y = 0
          if (vy < -0.5) { vy = -vy * REST; vx *= 0.8 }  // bounce up
          else { vy = 0; vx *= ROLL_FRICTION }           // roll
        }
        // start the chase once the ball is back near the floor (rolling or landing)
        const lowAndSlow = y <= 1 && vy <= 0
        if (lowAndSlow && modeRef.current !== 'chase' && modeRef.current !== 'fetch') {
          modeRef.current = 'chase'
          targetRef.current = { x, run: true }
          setFacingLeft(x < posRef.current); setAnim('run')
        }
        const atRest = y <= 0 && Math.abs(vy) < 0.05 && Math.abs(vx) < 0.06
        if (atRest) {
          return { x, y: 0, vx: 0, vy: 0, grounded: true, held: false }
        }
        return { x, y, vx, vy, grounded: false, held: false }
      })
    }, 16)
    return () => clearInterval(id)
  }, [])

  // ---- actions ----
  async function bumpPlay() {
    if (!pet) return
    const next = { ...pet, last_played: new Date().toISOString(), bond: pet.bond + 1 }
    setPet(next)
    await supabase.from('pet').update({ last_played: next.last_played, bond: next.bond }).eq('couple_id', coupleId)
  }
  async function feed() {
    if (!pet) return
    const next = { ...pet, last_fed: new Date().toISOString(), bond: pet.bond + 1 }
    setPet(next)
    modeRef.current = 'feed'; targetRef.current = null; setAnim('beg')
    setTimeout(() => { modeRef.current = 'roam'; setAnim('sit') }, 2200)
    await supabase.from('pet').update({ last_fed: next.last_fed, bond: next.bond }).eq('couple_id', coupleId)
  }
  async function saveName() {
    if (!pet) return
    const name = nameDraft.trim() || pet.name
    setPet({ ...pet, name })
    await supabase.from('pet').update({ name }).eq('couple_id', coupleId)
  }
  async function cuddle() {
    if (!pet) return
    const next = { ...pet, bond: pet.bond + 1 }
    setPet(next)
    modeRef.current = 'feed'; targetRef.current = null; setAnim('sit')
    setTimeout(() => { modeRef.current = 'roam'; setAnim('idle') }, 1800)
    await supabase.from('pet').update({ bond: next.bond }).eq('couple_id', coupleId)
  }

  // ---- stats (0..100), derived from timestamps ----
  const hunger = (() => {           // higher = hungrier (needs feeding)
    if (!pet) return 0
    const hrs = (Date.now() - new Date(pet.last_fed).getTime()) / 3.6e6
    return Math.max(0, Math.min(100, Math.round((hrs / 24) * 100)))
  })()
  const fullness = 100 - hunger
  const energy = (() => {           // higher = more playful/energised; drops since last play
    if (!pet) return 0
    const hrs = (Date.now() - new Date(pet.last_played).getTime()) / 3.6e6
    return Math.max(0, Math.min(100, Math.round(100 - (hrs / 18) * 100)))
  })()
  const bondLevel = Math.min(100, (pet?.bond ?? 0))

  // throw: a nice arc that lands at the target x
  function throwTo(targetX: number) {
    const b = ballRef.current
    const tx = Math.max(6, Math.min(88, targetX))
    const dist = tx - b.x
    const GRAV = 0.12
    const T = 34                       // longer flight = higher, more graceful arc
    const vx = dist / T
    const vy = (GRAV * T) / 2          // launch up; lands back at floor at tick T
    setBall({ x: b.x, y: 0.5, vx, vy, grounded: false, held: false })
    modeRef.current = 'roam'
    setArmed(false)
  }

  const a = ANIM[anim]
  const bgX = -(frame % COLS) * CW
  const bgY = -a.row * CH
  const flip = facingLeft !== !a.faceRight

  const moodLabel = (() => {
    if (!pet) return ''
    const hrsFed = (Date.now() - new Date(pet.last_fed).getTime()) / 3.6e6
    if (hrsFed > 20) return 'hungry'
    if (hrsFed > 10) return 'a little peckish'
    return 'happy and full'
  })()

  return (
    <>
      {/* floor click-catcher when the ball is armed */}
      {armed && (
        <div
          onClick={(e) => {
            const host = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
            const xPct = ((e.clientX - host.left) / host.width) * 100
            throwTo(xPct)
          }}
          style={{ position: 'absolute', inset: 0, zIndex: 8, cursor: 'crosshair' }}
        />
      )}

      {/* the ball (hidden while the dog carries it in its mouth) */}
      {!ball.held && (
        <div
          onClick={(e) => { e.stopPropagation(); if (ball.grounded) setArmed((s) => !s) }}
          title="tap the ball, then tap where to throw it"
          style={{
            position: 'absolute', left: `${ball.x}%`, bottom: `calc(2.5% + ${ball.y}%)`,
            zIndex: 9, width: 20, height: 20, cursor: ball.grounded ? 'pointer' : 'default',
            transform: `translateX(-50%) ${armed ? 'scale(1.15)' : 'scale(1)'}`,
            transition: 'transform .15s',
            background: `url(${BALL_SRC}) center/contain no-repeat, radial-gradient(circle at 35% 30%, #fff8, #e07a55 55%, #b14a32)`, borderRadius: 999,
            boxShadow: '0 2px 5px rgba(0,0,0,.35)',
            imageRendering: 'auto',
          }}
        />
      )}

      {/* the dog */}
      <div
        onClick={() => !armed && setPanel(true)}
        title={pet?.name ?? 'puppy'}
        style={{
          position: 'absolute', left: `${pos.x}%`, bottom: '2%', zIndex: 7,
          width: CW * SCALE, height: CH * SCALE, cursor: 'pointer',
          transform: `translateX(-50%) scaleX(${flip ? -1 : 1})`,
          imageRendering: 'pixelated', backgroundImage: `url(${SHEET})`,
          backgroundPosition: `${bgX * SCALE}px ${bgY * SCALE}px`,
          backgroundSize: `${COLS * CW * SCALE}px ${ROWS * CH * SCALE}px`,
          filter: 'drop-shadow(0 4px 4px rgba(0,0,0,.3))',
        }}
      />

      {/* care panel */}
      {panel && (
        <div onClick={() => { setPanel(false); saveName() }} style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(40,28,18,.5)', backdropFilter: 'blur(3px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(90vw, 330px)', background: 'linear-gradient(165deg,#f6ecd8,#ead7b8)', borderRadius: 20, padding: 22, fontFamily: "'Inter',system-ui,sans-serif", color: '#3a2a18', boxShadow: '0 24px 60px rgba(0,0,0,.5)' }}>
            <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#a9762a', marginBottom: 6 }}>our dog</div>
            <input
              value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="name your dog…" maxLength={24}
              style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 600, color: '#7a4a1e', background: 'rgba(255,255,255,.4)', border: '1px solid #c8893f44', borderRadius: 10, padding: '6px 10px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />

            {/* live preview */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 6px' }}>
              <div style={{ width: CW * 2, height: CH * 2, imageRendering: 'pixelated', backgroundImage: `url(${SHEET})`, backgroundPosition: `${-(frame % COLS) * CW * 2}px ${-a.row * CH * 2}px`, backgroundSize: `${COLS * CW * 2}px ${ROWS * CH * 2}px` }} />
            </div>
            <div style={{ textAlign: 'center', fontSize: 13.5, color: '#6a4a28', margin: '10px 0 14px' }}>
              {pet?.name || 'your pup'} is <strong style={{ color: '#7a4a1e' }}>{moodLabel}</strong>
            </div>

            {/* stat bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
              <StatBar label="Fullness" value={fullness} color="#c8893f" />
              <StatBar label="Energy" value={energy} color="#7d9a52" />
              <StatBar label="Bond" value={bondLevel} color="#d6708f" caption={`${pet?.bond ?? 0} moments shared`} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <button onClick={() => { feed(); setPanel(false) }} style={btn('#c8893f')}>feed</button>
              <button onClick={() => { setPanel(false); setArmed(true) }} style={btn('#7d9a52')}>play fetch</button>
              <button onClick={() => { cuddle(); setPanel(false) }} style={btn('#d6708f')}>cuddle</button>
              <button onClick={() => { setAnim('beg') }} style={btn('#6a8caf')}>trick</button>
            </div>
            <div style={{ fontSize: 11, color: '#3a2a18aa', textAlign: 'center', marginTop: 12 }}>
              tip: tap the ball on the floor, then tap where to throw it
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const btn = (c: string): React.CSSProperties => ({ padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13.5, fontFamily: "'Inter',system-ui,sans-serif", color: '#fff', background: c, width: '100%' })

function StatBar({ label, value, color, caption }: { label: string; value: number; color: string; caption?: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#6a4a28', marginBottom: 3 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: '#3a2a18aa' }}>{caption ?? `${value}%`}</span>
      </div>
      <div style={{ height: 7, borderRadius: 5, background: '#3a2a1815', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 5, transition: 'width .4s' }} />
      </div>
    </div>
  )
}
