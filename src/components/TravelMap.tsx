import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'

type Pin = { id: string; label: string; lat: number; lng: number; status: 'visited' | 'dream'; plan: string | null; created_at: string }
const HOME = { lat: 42.3601, lng: -71.0589, label: 'Boston' }

const SERIF = "'Fraunces', Georgia, serif"
const SANS = "'Inter', system-ui, sans-serif"
const VISITED = '#e8b24a'
const DREAM = '#ef6f97'
const HOMEC = '#ffffff'
const PAPER = '#f4ecda'

// curved arc between two latlngs (great-circle-ish bezier) as a list of points
function arcPoints(a: [number, number], b: [number, number], bend = 0.2): [number, number][] {
  const [lat1, lng1] = a, [lat2, lng2] = b
  const mid: [number, number] = [(lat1 + lat2) / 2, (lng1 + lng2) / 2]
  // offset perpendicular for a gentle curve
  const dx = lng2 - lng1, dy = lat2 - lat1
  const norm: [number, number] = [mid[0] + -dx * bend, mid[1] + dy * bend]
  const pts: [number, number][] = []
  for (let t = 0; t <= 1; t += 0.05) {
    const x = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * norm[0] + t * t * lat2
    const y = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * norm[1] + t * t * lng2
    pts.push([x, y])
  }
  return pts
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => { if (target) map.flyTo(target, 5, { duration: 1.1 }) }, [target]) // eslint-disable-line
  return null
}

export default function TravelMap({ coupleId, myId }: { coupleId: string; myId: string }) {
  const [pins, setPins] = useState<Pin[]>([])
  const [sel, setSel] = useState<Pin | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ name: string; detail: string; lat: number; lng: number }[]>([])
  const [searching, setSearching] = useState(false)
  const [planText, setPlanText] = useState('')
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const debounce = useRef<any>(null)

  async function load() {
    const { data } = await supabase.from('map_pins').select('id, label, lat, lng, status, plan, created_at').eq('couple_id', coupleId).order('created_at')
    setPins((data as Pin[]) ?? [])
  }
  useEffect(() => { load() }, []) // eslint-disable-line
  useEffect(() => { setPlanText(sel?.plan ?? '') }, [sel])

  // robust geocoding via Photon (komoot) — free, no key, fuzzy
  function onType(v: string) {
    setQuery(v)
    if (debounce.current) clearTimeout(debounce.current)
    if (v.trim().length < 2) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(v.trim())}&limit=6`)
        const d = await r.json()
        const out = (d.features ?? []).map((f: any) => {
          const p = f.properties || {}
          const name = p.name ?? ''
          const detail = [p.city, p.state, p.country].filter(Boolean).filter((x: string) => x !== name).join(', ')
          const [lng, lat] = f.geometry.coordinates
          return { name, detail, lat, lng }
        }).filter((x: any) => x.name)
        setResults(out)
      } catch { setResults([]) }
      setSearching(false)
    }, 280)
  }

  async function addPin(name: string, lat: number, lng: number, status: 'visited' | 'dream') {
    const { data } = await supabase.from('map_pins').insert({ couple_id: coupleId, author_id: myId, label: name, lat, lng, status, plan: null })
      .select('id, label, lat, lng, status, plan, created_at').single()
    setQuery(''); setResults([])
    await load()
    if (data) { setSel(data as Pin); setFlyTarget([lat, lng]) }
  }
  async function updatePin(id: string, patch: Partial<Pin>) {
    setPins((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    setSel((s) => (s && s.id === id ? { ...s, ...patch } as Pin : s))
    await supabase.from('map_pins').update(patch).eq('id', id)
  }
  async function del(id: string) { await supabase.from('map_pins').delete().eq('id', id); setSel(null); await load() }

  const visited = pins.filter((p) => p.status === 'visited').length

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', color: PAPER, fontFamily: SANS, background: 'linear-gradient(165deg,#1d2b33,#14222a)', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid #2f4b55', width: '100%' }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #2f4b55', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: '#f3e7cf' }}>Bucket list</div>
          <div style={{ fontSize: 12, color: '#9fb4ab', marginTop: 2 }}>{visited} visited · {pins.length - visited} on the bucket list · home is {HOME.label}</div>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: '#9fb4ab' }}>
          <Legend c={HOMEC} t="home" /><Legend c={VISITED} t="visited" /><Legend c={DREAM} t="dream" />
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {/* MAP */}
        <div style={{ flex: '1 1 460px', minWidth: 0, height: 440, position: 'relative' }}>
          <MapContainer center={[30, -20]} zoom={2} minZoom={2} worldCopyJump style={{ height: '100%', width: '100%', background: '#0f1d24' }} attributionControl={false}>
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}" />
            <FlyTo target={flyTarget} />
            {/* arcs from Boston to each pin */}
            {pins.map((p) => (
              <Polyline key={'a' + p.id} positions={arcPoints([HOME.lat, HOME.lng], [p.lat, p.lng])}
                pathOptions={{ color: p.status === 'visited' ? VISITED : DREAM, weight: 3, opacity: 0.85, dashArray: p.status === 'dream' ? '6 8' : undefined }} />
            ))}
            {/* home */}
            <CircleMarker center={[HOME.lat, HOME.lng]} radius={8} pathOptions={{ color: '#12202a', weight: 2, fillColor: HOMEC, fillOpacity: 1 }}>
              <Tooltip direction="top">{HOME.label} · home</Tooltip>
            </CircleMarker>
            {/* pins */}
            {pins.map((p) => (
              <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={sel?.id === p.id ? 10 : 7}
                pathOptions={{ color: '#12202a', weight: 2.5, fillColor: p.status === 'visited' ? VISITED : DREAM, fillOpacity: 1 }}
                eventHandlers={{ click: () => { setSel(p); setFlyTarget([p.lat, p.lng]) } }}>
                <Tooltip direction="top">{p.label}</Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* PANEL */}
        <div style={{ flex: '1 1 280px', minWidth: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 440, overflowY: 'auto' }}>
          <div>
            <input value={query} onChange={(e) => onType(e.target.value)} placeholder="search any city or place…"
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: '11px 13px', fontFamily: SANS, fontSize: 14, color: '#1a2a30', background: PAPER, border: 'none', outline: 'none' }} />
            {searching && <div style={{ fontSize: 12, color: '#9fb4ab', marginTop: 6 }}>searching…</div>}
            {results.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {results.map((r, i) => (
                  <div key={i} style={{ background: '#ffffff10', borderRadius: 10, padding: '9px 11px', fontSize: 13.5 }}>
                    <div style={{ marginBottom: 7 }}><strong>{r.name}</strong>{r.detail ? <span style={{ color: '#9fb4ab' }}> · {r.detail}</span> : null}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => addPin(r.name, r.lat, r.lng, 'visited')} style={chip(VISITED)}>+ visited</button>
                      <button onClick={() => addPin(r.name, r.lat, r.lng, 'dream')} style={chip(DREAM)}>+ dream</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {sel ? (
            <div style={{ background: '#ffffff0d', borderRadius: 12, padding: 14, border: '1px solid #ffffff14' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: '#f3e7cf' }}>{sel.label}</div>
                <button onClick={() => del(sel.id)} style={{ background: 'none', border: 'none', color: '#9fb4ab', cursor: 'pointer', fontSize: 12 }}>remove</button>
              </div>
              <div style={{ display: 'flex', gap: 6, margin: '10px 0' }}>
                <button onClick={() => updatePin(sel.id, { status: 'visited' })} style={toggle(sel.status === 'visited', VISITED)}>visited</button>
                <button onClick={() => updatePin(sel.id, { status: 'dream' })} style={toggle(sel.status === 'dream', DREAM)}>dream</button>
              </div>
              <textarea value={planText} onChange={(e) => setPlanText(e.target.value)} onBlur={() => updatePin(sel.id, { plan: planText })}
                rows={4} placeholder="the plan… when, what to do, where to stay"
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', borderRadius: 10, padding: 11, fontFamily: SERIF, fontSize: 14, lineHeight: 1.5, color: '#1a2a30', background: PAPER, border: 'none', outline: 'none' }} />
            </div>
          ) : (
            <p style={{ fontSize: 13.5, color: '#9fb4ab', lineHeight: 1.5, fontFamily: SERIF }}>search a place to drop a pin, or tap any pin to see the plan. every journey is drawn from {HOME.label}.</p>
          )}

          {pins.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pins.map((p) => (
                <button key={p.id} onClick={() => { setSel(p); setFlyTarget([p.lat, p.lng]) }} style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', cursor: 'pointer', background: sel?.id === p.id ? '#ffffff14' : 'transparent', border: 'none', borderRadius: 8, padding: '8px 9px', color: PAPER, fontSize: 13.5, fontFamily: SANS }}>
                  <span style={{ width: 9, height: 9, borderRadius: 99, background: p.status === 'visited' ? VISITED : DREAM, flexShrink: 0 }} />{p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Legend({ c, t }: { c: string; t: string }) { return <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 99, background: c, display: 'inline-block' }} />{t}</span> }
const chip = (c: string): React.CSSProperties => ({ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: SANS, color: '#1a2a30', background: c })
const toggle = (on: boolean, c: string): React.CSSProperties => ({ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${on ? c : '#ffffff22'}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: SANS, background: on ? c : 'transparent', color: on ? '#1a2a30' : '#9fb4ab' })
