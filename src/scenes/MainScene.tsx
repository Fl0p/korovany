import { useEffect, useRef } from 'react'
import {
  ArcRotateCamera,
  Engine,
  HemisphericLight,
  Scene,
  Vector3,
} from '@babylonjs/core'
import { loadModel } from './modelLoader'

/**
 * Minimal Babylon.js canvas — loads the normalized treasure-chest GLB on a lit,
 * orbit-controlled scene. Exists to prove the Babylon + React + Vite build path
 * and the `loadModel()` GLB import pipeline work end-to-end. The real game
 * scenes live alongside this under `src/scenes/`.
 */
export function MainScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new Engine(canvas, true)
    const scene = new Scene(engine)

    const camera = new ArcRotateCamera('camera', Math.PI / 4, Math.PI / 3, 6, Vector3.Zero(), scene)
    camera.attachControl(canvas, true)

    new HemisphericLight('light', new Vector3(0, 1, 0), scene)

    // Load the web-ready GLB through the shared loader so it lands at a sane
    // size (longest side ~2 units), grounded on the floor plane, and centered.
    // Fire-and-forget: the render loop below draws it as soon as it resolves.
    void loadModel(scene, '/models/chest.glb')

    engine.runRenderLoop(() => scene.render())

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      engine.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '320px', display: 'block' }} />
}
