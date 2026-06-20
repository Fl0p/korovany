import { useEffect, useRef } from 'react'
import { createGameEngine } from '../engine'

/**
 * Thin React wrapper around the Babylon engine. It owns nothing but the canvas
 * element and the mount/unmount lifecycle: on mount it hands the canvas to
 * {@link createGameEngine}, on unmount it disposes. All engine logic lives in
 * `src/engine/` — keep this component dumb.
 */
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const game = createGameEngine(canvas)
    return () => game.dispose()
  }, [])

  return <canvas ref={canvasRef} className="render-canvas" />
}
