import { ReactNode } from 'react'

export function Tile({
  title,
  accent,
  children,
  wide,
}: {
  title: string
  accent?: string
  children?: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-black/30 backdrop-blur p-5 flex flex-col ${
        wide ? 'sm:col-span-2 lg:col-span-3' : ''
      }`}
    >
      <h3
        className="text-[11px] tracking-[1.5px] uppercase font-semibold mb-3"
        style={{ color: accent ?? '#b3a9cf' }}
      >
        {title}
      </h3>
      <div className="text-cream/90 text-sm flex-1">{children}</div>
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return <span className="text-muted">{text}</span>
}
