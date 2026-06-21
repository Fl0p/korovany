import {
  Scene,
  TransformNode,
  Mesh,
  AbstractMesh,
  type Vector3,
} from '@babylonjs/core'
import type { AssetStreamLoader } from './loader'

export interface LODConfig {
  /** Distance threshold for switching to impostor (default 40) */
  impostorDistance?: number
  /** Distance where full mesh is always shown (default 15) */
  fullMeshDistance?: number
  /** Hysteresis buffer to prevent flickering (default 5) */
  hysteresisBuffer?: number
}

const DEFAULT_LOD_CONFIG: Required<LODConfig> = {
  impostorDistance: 40,
  fullMeshDistance: 15,
  hysteresisBuffer: 5,
}

export interface LODInstance {
  /** Root TransformNode for placement (position/rotation). */
  root: TransformNode
  /** First mesh of the full model — visibility-controlled by the LOD system. */
  firstMesh: AbstractMesh
  /** Billboard impostor (camera-facing sprite). */
  impostor: Mesh
  /** Current LOD state. */
  state: 'impostor' | 'fullMesh'
  /** Drop refs; call when the instance is removed from the scene. */
  release: () => void
}

export class LODManager {
  private readonly config: Required<LODConfig>
  private readonly scene: Scene
  private readonly roots = new Map<string, TransformNode>()
  private readonly firstMeshes = new Map<string, AbstractMesh>()
  private readonly impostors = new Map<string, Mesh>()
  private readonly states = new Map<string, 'impostor' | 'fullMesh'>()
  private readonly playerPos: Vector3
  private disposed = false

  constructor(
    scene: Scene,
    private readonly loader: AssetStreamLoader,
    config: LODConfig = {},
    playerPos: Vector3,
  ) {
    this.config = { ...DEFAULT_LOD_CONFIG, ...config }
    this.scene = scene
    this.playerPos = playerPos
  }

  async spawnLODInstance(
    assetId: string,
    position: { x: number; y: number; z: number },
    rotationY = 0,
  ): Promise<LODInstance> {
    if (this.disposed) {
      throw new Error('LODManager disposed')
    }

    const fullModel = await this.loader.acquire(assetId)
    const root = fullModel.root
    const firstMesh = fullModel.meshes[0]

    const impostor = this.createImpostor(assetId, position)

    root.position.set(position.x, position.y, position.z)
    root.rotation.y = rotationY
    impostor.position.set(position.x, position.y, position.z)
    impostor.rotation.y = rotationY

    const initialDistance = this.distanceToPlayer(position)
    const state = this.evaluateState(initialDistance, 'impostor')
    this.applyVisibility(firstMesh, impostor, state)

    this.roots.set(assetId, root)
    this.firstMeshes.set(assetId, firstMesh)
    this.impostors.set(assetId, impostor)
    this.states.set(assetId, state)

    return { root, firstMesh, impostor, state, release: () => this.releaseInstance(assetId) }
  }

  private createImpostor(assetId: string, position: { x: number; y: number; z: number }): Mesh {
    const impostor = Mesh.CreateBox(`impostor-${assetId}`, 1, this.scene)
    impostor.billboardMode = TransformNode.BILLBOARDMODE_ALL
    impostor.isVisible = true
    impostor.position.set(position.x, position.y, position.z)
    impostor.scaling.set(1, 3, 0.5)
    return impostor
  }

  private applyVisibility(firstMesh: AbstractMesh, impostor: Mesh, state: 'impostor' | 'fullMesh'): void {
    const showFull = state === 'fullMesh'
    firstMesh.isVisible = showFull
    impostor.isVisible = !showFull
  }

  private evaluateState(distance: number, currentState: 'impostor' | 'fullMesh'): 'impostor' | 'fullMesh' {
    const { impostorDistance, fullMeshDistance, hysteresisBuffer } = this.config
    if (currentState === 'impostor') {
      return distance <= fullMeshDistance + hysteresisBuffer ? 'fullMesh' : 'impostor'
    }
    return distance >= impostorDistance + hysteresisBuffer ? 'impostor' : 'fullMesh'
  }

  update(): void {
    if (this.disposed) return
    for (const [assetId, state] of this.states.entries()) {
      const root = this.roots.get(assetId)
      const firstMesh = this.firstMeshes.get(assetId)
      const impostor = this.impostors.get(assetId)
      if (!root || !firstMesh || !impostor) continue

      const pos = root.position
      const distance = this.distanceToPlayer({ x: pos.x, y: pos.y, z: pos.z })
      const newState = this.evaluateState(distance, state)
      if (newState !== state) {
        this.states.set(assetId, newState)
        this.applyVisibility(firstMesh, impostor, newState)
      }
    }
  }

  private distanceToPlayer(point: { x: number; y: number; z: number }): number {
    const dx = point.x - this.playerPos.x
    const dy = point.y - this.playerPos.y
    const dz = point.z - this.playerPos.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  private releaseInstance(assetId: string): void {
    if (this.roots.has(assetId)) {
      this.loader.release(assetId)
      this.roots.delete(assetId)
      this.firstMeshes.delete(assetId)
    }
    const impostor = this.impostors.get(assetId)
    if (impostor) {
      impostor.dispose()
      this.impostors.delete(assetId)
    }
    this.states.delete(assetId)
  }

  getState(assetId: string): 'impostor' | 'fullMesh' {
    return this.states.get(assetId) ?? 'impostor'
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const id of [...this.roots.keys()]) {
      this.releaseInstance(id)
    }
  }
}
