/**
 * Floating damage number: shows "+N" above the target for 600ms then fades.
 * Rendered as a DOM overlay so it never competes with the Babylon canvas.
 */
import { useEffect, useRef, useState } from 'react'

export interface DamageNumberEntry {
  id: number
  amount: number
  /** CSS left/top as percentages of the viewport (0–100). */
  x: number
  y: number
}

interface Props {
  entries: DamageNumberEntry[]
  onExpire: (id: number) => void
}

const DISPLAY_MS = 600

export function DamageNumbers({ entries, onExpire }: Props) {
  return (
    <div className="damage-numbers" aria-hidden="true">
      {entries.map((e) => (
        <DamageNumberItem key={e.id} entry={e} onExpire={onExpire} />
      ))}
    </div>
  )
}

function DamageNumberItem({ entry, onExpire }: { entry: DamageNumberEntry; onExpire: (id: number) => void }) {
  const [opacity, setOpacity] = useState(1)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    // Fade out during the last 200ms.
    const fadeDelay = DISPLAY_MS - 200
    const fadeId = window.setTimeout(() => setOpacity(0), fadeDelay)
    const expireId = window.setTimeout(() => onExpireRef.current(entry.id), DISPLAY_MS)
    return () => {
      window.clearTimeout(fadeId)
      window.clearTimeout(expireId)
    }
  }, [entry.id])

  return (
    <span
      className="damage-number"
      style={{
        left: `${entry.x}%`,
        top: `${entry.y}%`,
        opacity,
        transition: opacity === 0 ? 'opacity 0.2s ease-out' : undefined,
      }}
    >
      +{entry.amount}
    </span>
  )
}
