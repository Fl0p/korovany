import { ArcRotateCamera, Color3, HemisphericLight, Vector3 } from '@babylonjs/core'
import { createGameEngine } from '../engine'
import { buildPlayerAvatar } from './playerAvatar'

/**
 * Menu / end-of-run backdrop scene (FLO-452).
 *
 * `phase === 'menu'` shows this behind the title, and the won/lost overlay renders
 * directly above it — so whatever stands here is the "defeat-screen hero". It used
 * to be the retired, semi-realistic `korovany_hero_player-default.glb` streamed by
 * the engine smoke (off-spec for the CEO-locked v1.2 low-poly language). This
 * shows the SAME procedural faceted avatar the player wears in-game
 * ({@link buildPlayerAvatar}, FLO-422) on a slow turntable, so the menu, the
 * defeat screen and live play all read as one coherent art style.
 *
 * It reuses {@link createGameEngine} for the Babylon lifecycle (with streaming
 * disabled) and only decorates the scene, keeping the engine layer generic.
 */
export function createMenuScene(canvas: HTMLCanvasElement): { dispose(): void } {
  // No streamed GLB — the hero is built procedurally below.
  const game = createGameEngine(canvas, { streamAssetId: null })
  const { scene } = game

  // Warm, slightly angled key light + a dim ground fill so the faceted box
  // silhouette reads (a straight-down hemispheric leaves the sides flat-black).
  const light = scene.lights[0]
  if (light instanceof HemisphericLight) {
    light.direction = new Vector3(0.35, 1, 0.45)
    light.groundColor = new Color3(0.24, 0.24, 0.29)
    light.intensity = 0.95
  }

  const avatar = buildPlayerAvatar(scene)
  // Feet at local y=0; drop it so the torso sits on the camera target.
  avatar.root.position = new Vector3(0, -0.9, 0)

  // Frame the figure as a portrait and stop the canvas from eating drags meant
  // for the menu buttons layered on top.
  const cam = scene.activeCamera
  if (cam instanceof ArcRotateCamera) {
    cam.detachControl()
    cam.setTarget(new Vector3(0, 0.05, 0))
    cam.alpha = Math.PI / 3
    cam.beta = Math.PI / 2.35
    cam.radius = 4.2
  }

  // Gentle idle turntable so the silhouette reads from all sides.
  let theta = Math.PI // start facing roughly toward the camera
  const spin = () => {
    theta += 0.0035
    avatar.root.rotation = new Vector3(0, theta, 0)
  }
  scene.onBeforeRenderObservable.add(spin)

  return {
    dispose() {
      scene.onBeforeRenderObservable.removeCallback(spin)
      avatar.dispose()
      game.dispose()
    },
  }
}
