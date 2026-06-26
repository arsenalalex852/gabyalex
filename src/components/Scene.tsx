import { useRef, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { WALL_SRC, WALL_RATIO, SHELF, PAINTING, PAINTING_ART, TABLE, MAP, FRAMES, PLANNER_FRAME, PLANNER_OPENING, PHOTOS, ZONES, Zone } from '../scene/sceneConfig'
import Modal from './Modal'
import Mailbox from './Mailbox'
import Savings from './Savings'
import DateJar from './DateJar'
import MemoryChest from './MemoryChest'
import MediaList from './MediaList'
import Brainstorm from './Brainstorm'
import TravelMap from './TravelMap'
import Dog from './Dog'
import Planner from './Planner'

type Box = { src: string; xPct: number; yPct: number; widthPct: number; hPct?: number }
const BORDER = 14

export default function Scene({ coupleId, myId }: { coupleId: string; myId: string }) {
  const { profile, signOut } = useAuth()
  const myName = profile?.display_name ?? 'alex'
  const isAlex = (profile?.display_name ?? '').toLowerCase().includes('alex')
  const stageRef = useRef<HTMLDivElement>(null)
  const [shelf, setShelf] = useState<Box>(SHELF)
  const [painting, setPainting] = useState<Box>(PAINTING)
  const [table, setTable] = useState<Box>(TABLE)
  const [map, setMap] = useState<Box>(MAP)
  const [frames, setFrames] = useState<Box>(FRAMES)
  const [planner, setPlanner] = useState<Box>(PLANNER_FRAME)
  // who's currently on the page (live presence)
  const [online, setOnline] = useState<{ alex: boolean; gaby: boolean }>({ alex: isAlex, gaby: !isAlex })
  useEffect(() => {
    const ch = supabase.channel(`presence:${coupleId}`, { config: { presence: { key: myId } } })
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, { isAlex: boolean }[]>
      let alex = false, gaby = false
      Object.values(state).forEach((metas) => metas.forEach((m) => { if (m.isAlex) alex = true; else gaby = true }))
      setOnline({ alex, gaby })
    })
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await ch.track({ isAlex })
    })
    return () => { supabase.removeChannel(ch) }
  }, [coupleId, myId, isAlex])
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 760)
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 760)
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])
  const [zones, setZones] = useState<Zone[]>(ZONES)
  const [edit, setEdit] = useState(false)
  const [drag, setDrag] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const setters: Record<string, (b: Box) => void> = {
    shelf: setShelf as any, painting: setPainting as any, table: setTable as any, map: setMap as any, frames: setFrames as any, planner: setPlanner as any,
  }
  const boxes: Record<string, Box> = { shelf, painting, table, map, frames, planner }

  function pct(e: React.PointerEvent) {
    const r = stageRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }
  function onMove(e: React.PointerEvent) {
    if (!edit || !drag || !stageRef.current) return
    const { x, y } = pct(e)
    if (drag.startsWith('z:')) {
      const zid = drag.slice(2)
      setZones((zs) => zs.map((z) => (z.id === zid ? { ...z, xPct: +x.toFixed(1), yPct: +y.toFixed(1) } : z)))
    } else if (boxes[drag]) {
      setters[drag]({ ...boxes[drag], xPct: +x.toFixed(1), yPct: +y.toFixed(1) })
    }
  }
  function resize(id: string, d: number) {
    if (boxes[id]) setters[id]({ ...boxes[id], widthPct: Math.max(6, +(boxes[id].widthPct + d).toFixed(1)) })
  }
  function resizeH(id: string, d: number) {
    if (boxes[id]) setters[id]({ ...boxes[id], hPct: Math.max(8, +(((boxes[id].hPct ?? 44) + d)).toFixed(1)) })
  }
  function resizeZone(id: string, dw: number, dh: number) {
    setZones((zs) => zs.map((z) => (z.id === id ? { ...z, wPct: Math.max(2, +(z.wPct + dw).toFixed(1)), hPct: Math.max(2, +(z.hPct + dh).toFixed(1)) } : z)))
  }
  function copyPositions() {
    const out = { shelf, painting, table, map, frames, planner, plannerOpening: PLANNER_OPENING, photos: PHOTOS, zones }
    navigator.clipboard?.writeText(JSON.stringify(out, null, 2))
    alert('Layout copied — paste it to me or into sceneConfig.ts')
  }

  // a draggable image layer — in edit mode it's moved ONLY via a small handle,
  // so the image's big transparent rectangle never steals clicks.
  function Layer({ id, z }: { id: string; z: number }) {
    const b = boxes[id]
    return (
      <div
        style={{ position: 'absolute', left: `${b.xPct}%`, top: `${b.yPct}%`, width: `${b.widthPct}%`, transform: 'translate(-50%,-50%)', zIndex: z, pointerEvents: 'none' }}>
        <img src={b.src} alt={id} draggable={false} style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 8px 12px rgba(58,30,12,.35))', pointerEvents: 'none' }} />
        {/* photos composited into the frames image */}
        {id === 'frames' && PHOTOS.map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: `${p.xPct}%`, top: `${p.yPct}%`, width: `${p.wPct}%`, height: `${p.hPct}%`, transform: 'translate(-50%,-50%)', overflow: 'hidden', borderRadius: 3 }}>
            <img src={p.src} alt={`us ${i + 1}`} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
          </div>
        ))}
        {/* her painting composited into the painting frame opening */}
        {id === 'painting' && (
          <div style={{ position: 'absolute', left: `${PAINTING_ART.xPct}%`, top: `${PAINTING_ART.yPct}%`, width: `${PAINTING_ART.wPct}%`, height: `${PAINTING_ART.hPct}%`, transform: 'translate(-50%,-50%)', overflow: 'hidden', zIndex: -1 }}>
            <img src={PAINTING_ART.src} alt="her painting" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
          </div>
        )}
        {/* edit handle: the ONLY grabbable part of the image */}
        {edit && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, pointerEvents: 'auto' }}>
            <div onPointerDown={(e) => { e.stopPropagation(); setDrag(id) }}
              style={{ cursor: 'grab', background: 'rgba(58,46,38,.92)', color: '#f6efe0', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,.4)' }}>
              ✥ {id}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onPointerDown={(e) => { e.stopPropagation(); resize(id, -2) }} style={mini}>−</button>
              <button onPointerDown={(e) => { e.stopPropagation(); resize(id, +2) }} style={mini}>+</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: '#3a2a4d', padding: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: BORDER + 8, left: BORDER + 10, display: 'flex', alignItems: 'center', zIndex: 60 }}
          title={`${online.alex ? 'Alex' : ''}${online.alex && online.gaby ? ' & ' : ''}${online.gaby ? 'Gaby' : ''}${online.alex || online.gaby ? ' here now' : ''}`}>
          <span style={{ width: 11, height: 11, borderRadius: 999, background: '#4a7fd6', display: 'inline-block',
            boxShadow: online.alex ? '0 0 10px 2px #4a7fd6' : 'none', opacity: online.alex ? 1 : 0.25, transition: 'opacity .4s, box-shadow .4s' }} />
          <span style={{ width: 11, height: 11, borderRadius: 999, background: '#d6443f', display: 'inline-block', marginLeft: -3,
            boxShadow: online.gaby ? '0 0 10px 2px #d6443f' : 'none', opacity: online.gaby ? 1 : 0.25, transition: 'opacity .4s, box-shadow .4s' }} />
        </div>

        <div ref={stageRef} onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)}
          style={{ position: 'relative', width: '100%', maxWidth: `min(calc(100vw - ${BORDER * 2}px), calc((100vh - ${BORDER * 2}px) * ${WALL_RATIO}))`, aspectRatio: String(WALL_RATIO), borderRadius: 14, overflow: 'hidden', boxShadow: '0 18px 50px rgba(0,0,0,.5)', background: `#e9dcc6 url(${WALL_SRC}) center/cover`, touchAction: edit ? 'none' : 'auto' }}>

          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 40, display: 'flex', gap: 6 }}>
            {edit && isAlex && <button onClick={copyPositions} style={ctrl}>copy</button>}
            {isAlex && <button onClick={() => setEdit((v) => !v)} style={{ ...ctrl, background: edit ? '#c0623f' : 'rgba(0,0,0,.4)', color: '#fff' }}>{edit ? '✓ done' : '✎ edit'}</button>}
            <button onClick={() => signOut()} style={{ ...ctrl, background: 'rgba(0,0,0,.4)', color: '#fff' }}>sign out</button>
          </div>

          {/* planner: full panel on desktop; on phone a tappable label that opens a modal */}
          {isMobile ? (
            <button onClick={() => setOpen('planner')} style={{
              position: 'absolute', left: `${planner.xPct}%`, top: `${planner.yPct}%`,
              transform: 'translate(-50%,-50%)', zIndex: 6,
              background: 'linear-gradient(165deg, rgba(34,25,16,.94), rgba(22,15,9,.95))', color: '#e8d9b8',
              border: '1px solid rgba(224,178,81,.3)', borderRadius: 12, padding: '12px 20px',
              fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            }}>Our planner ›</button>
          ) : (
          <div style={{ position: 'absolute', left: `${planner.xPct}%`, top: `${planner.yPct}%`, width: `${planner.widthPct}%`, height: `${planner.hPct ?? 44}%`, transform: 'translate(-50%,-50%)', zIndex: 6, pointerEvents: edit ? 'none' : 'auto' }}>
            <Planner coupleId={coupleId} myId={myId} onWall />
            {edit && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'auto' }}>
                <div onPointerDown={(e) => { e.stopPropagation(); setDrag('planner') }}
                  style={{ cursor: 'grab', background: 'rgba(58,46,38,.95)', color: '#f6efe0', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,.5)' }}>✥ drag planner</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: '#f6efe0', background: 'rgba(58,46,38,.8)', padding: '2px 5px', borderRadius: 5 }}>W</span>
                  <button onPointerDown={(e) => { e.stopPropagation(); resize('planner', -2) }} style={mini}>−</button>
                  <button onPointerDown={(e) => { e.stopPropagation(); resize('planner', +2) }} style={mini}>+</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: '#f6efe0', background: 'rgba(58,46,38,.8)', padding: '2px 5px', borderRadius: 5 }}>H</span>
                  <button onPointerDown={(e) => { e.stopPropagation(); resizeH('planner', -2) }} style={mini}>−</button>
                  <button onPointerDown={(e) => { e.stopPropagation(); resizeH('planner', +2) }} style={mini}>+</button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* wall-hung items behind */}
          <Layer id="map" z={1} />
          <Layer id="painting" z={1} />
          <Layer id="frames" z={2} />
          {/* furniture */}
          <Layer id="table" z={2} />
          <Layer id="shelf" z={3} />

          {/* clickable zones on top */}
          {zones.filter((zn) => !zn.alexOnly || isAlex).map((zn) => (
            <div key={zn.id} onPointerDown={() => edit && setDrag('z:' + zn.id)} onClick={() => !edit && setOpen(zn.feature)} title={zn.label} className={edit ? '' : 'zone'}
              style={{ position: 'absolute', left: `${zn.xPct}%`, top: `${zn.yPct}%`, width: `${zn.wPct}%`, height: `${zn.hPct}%`, transform: 'translate(-50%,-50%)', borderRadius: 10, zIndex: edit ? 20 : 5, cursor: edit ? 'grab' : 'pointer', border: edit ? '2px dashed rgba(192,98,63,.9)' : '2px solid transparent', background: edit ? 'rgba(192,98,63,.12)' : 'transparent', transition: 'background .15s' }}>
              {edit && (
                <div style={{ position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 3 }}>
                  <button onPointerDown={(e) => { e.stopPropagation(); resizeZone(zn.id, -1, 0) }} style={mini}>W−</button>
                  <button onPointerDown={(e) => { e.stopPropagation(); resizeZone(zn.id, +1, 0) }} style={mini}>W+</button>
                  <button onPointerDown={(e) => { e.stopPropagation(); resizeZone(zn.id, 0, -1) }} style={mini}>H−</button>
                  <button onPointerDown={(e) => { e.stopPropagation(); resizeZone(zn.id, 0, +1) }} style={mini}>H+</button>
                </div>
              )}
              {edit && <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#3a2e26', whiteSpace: 'nowrap' }}>{zn.label}</span>}
            </div>
          ))}
          {!edit && <Dog coupleId={coupleId} myId={myId} myName={myName} />}
        </div>
      </div>

      <Modal open={open === 'mailbox'} onClose={() => setOpen(null)}><Mailbox coupleId={coupleId} myId={myId} /></Modal>
      <Modal open={open === 'savings'} onClose={() => setOpen(null)}><Savings coupleId={coupleId} /></Modal>
      <Modal open={open === 'jar:date'} onClose={() => setOpen(null)}><DateJar coupleId={coupleId} myId={myId} /></Modal>
      <Modal open={open === 'jar:memory'} onClose={() => setOpen(null)}><MemoryChest coupleId={coupleId} myId={myId} /></Modal>
      <Modal open={open === 'books'} onClose={() => setOpen(null)} wide><MediaList kind="books" coupleId={coupleId} myName={myName} /></Modal>
      <Modal open={open === 'watch'} onClose={() => setOpen(null)} wide><MediaList kind="movies" coupleId={coupleId} myName={myName} /></Modal>
      <Modal open={open === 'brainstorm'} onClose={() => setOpen(null)}><Brainstorm coupleId={coupleId} /></Modal>
      <Modal open={open === 'stretch'} onClose={() => setOpen(null)} wide>
        <div style={{ background: '#14171c', borderRadius: 16, overflow: 'hidden', height: '80vh', boxShadow: '0 24px 60px rgba(0,0,0,.5)' }}>
          <iframe src="/stretch.html" title="stretching" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
        </div>
      </Modal>
      <Modal open={open === 'planner'} onClose={() => setOpen(null)} wide>
        <div style={{ background: 'linear-gradient(165deg, rgba(34,25,16,.97), rgba(22,15,9,.98))', borderRadius: 16, padding: 4, height: '70vh' }}>
          <Planner coupleId={coupleId} myId={myId} stacked />
        </div>
      </Modal>
      <Modal open={open === 'map'} onClose={() => setOpen(null)} wide>
        <TravelMap coupleId={coupleId} myId={myId} />
      </Modal>

      <style>{`.zone:hover{background:rgba(255,235,180,.22)!important;box-shadow:0 0 0 2px rgba(255,210,140,.7),0 0 22px rgba(255,200,120,.4) inset}`}</style>
    </>
  )
}

const ctrl: React.CSSProperties = { fontSize: 12, padding: '5px 10px', borderRadius: 9, cursor: 'pointer', border: 'none', background: 'rgba(0,0,0,.4)', color: '#fff', fontWeight: 600 }
const mini: React.CSSProperties = { minWidth: 22, height: 22, padding: '0 5px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#3a2e26', color: '#f6efe0', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }
