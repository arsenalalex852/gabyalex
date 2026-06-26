import { ReactNode } from 'react'

export default function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(40,28,18,.55)', backdropFilter: 'blur(3px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', width: '100%', maxWidth: wide ? 'min(94vw, 880px)' : 420, maxHeight: '92vh', overflowY: 'auto', animation: 'pop .18s ease' }}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: -10, right: -10, zIndex: 2, width: 30, height: 30, borderRadius: 999,
                   background: '#3a2e26', color: '#f6efe0', border: 'none', cursor: 'pointer', fontSize: 15 }}
        >✕</button>
        {children}
      </div>
      <style>{`@keyframes pop{from{opacity:0;transform:scale(.96) translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  )
}
