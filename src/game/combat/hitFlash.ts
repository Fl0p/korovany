/**
 * Hit-flash effect: briefly tints a Babylon mesh red for `duration` ms when it
 * takes damage, then restores the original diffuse colour.
 *
 * Depends on Babylon's `StandardMaterial` only; tree-shaken away if unused.
 */
import { Color3, type AbstractMesh, StandardMaterial } from '@babylonjs/core'

export interface HitFlashParams {
  /** How long the red tint stays visible, in seconds. */
  duration: number
  /** The tint colour applied while flashing. */
  flashColor: Color3
}

export const DEFAULT_HIT_FLASH_PARAMS: HitFlashParams = {
  duration: 0.08,
  flashColor: new Color3(1, 0.1, 0.1),
}

interface ActiveFlash {
  mesh: AbstractMesh
  originalColor: Color3
  timer: number
  material: StandardMaterial
}

export class HitFlashManager {
  private flashes: ActiveFlash[] = []
  private readonly params: HitFlashParams

  constructor(params: HitFlashParams = DEFAULT_HIT_FLASH_PARAMS) {
    this.params = params
  }

  /**
   * Start (or restart) a flash on `mesh`. If the mesh has no StandardMaterial
   * this is a no-op — exotic materials are left untouched.
   */
  flash(mesh: AbstractMesh): void {
    const mat = mesh.material
    if (!(mat instanceof StandardMaterial)) return

    // If already flashing, reset the timer without stacking a second entry.
    const existing = this.flashes.find((f) => f.mesh === mesh)
    if (existing) {
      existing.timer = this.params.duration
      return
    }

    const originalColor = mat.diffuseColor.clone()
    mat.diffuseColor = this.params.flashColor.clone()
    this.flashes.push({ mesh, originalColor, timer: this.params.duration, material: mat })
  }

  /** Advance all active flashes by `dt` seconds. */
  update(dt: number): void {
    const remaining: ActiveFlash[] = []
    for (const f of this.flashes) {
      f.timer -= dt
      if (f.timer <= 0) {
        // Restore original colour when the flash expires.
        f.material.diffuseColor = f.originalColor
      } else {
        remaining.push(f)
      }
    }
    this.flashes = remaining
  }

  /** Number of currently active flashes (for tests). */
  get activeCount(): number {
    return this.flashes.length
  }
}
