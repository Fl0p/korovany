import {
  Color3,
  type Mesh,
  MeshBuilder,
  type Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core'

/**
 * Procedural low-poly player avatar (P7.4 / FLO-422).
 *
 * The shipped hero GLB (`korovany_hero_player-default.glb`) is a single merged,
 * **rig-less** mesh baked in a wide arms-out "scarecrow" T-pose — it reads as a
 * surrendering bystander, not a fighter, and the README flagged its
 * semi-realistic surface as off-spec for the CEO-locked v1.2 low-poly visual
 * language. Re-posing its arms is impossible without a skeleton (Meshy spend +
 * board gate, a separate asset ticket).
 *
 * So the player visual is built here from flat-shaded box primitives in a braced
 * boxer's guard (fists up beside the head, elbows out, staggered stance). It is a
 * two-way door: zero asset cost, pure geometry, and a future rigged hero can drop
 * back in behind the same `root` + animator contract. Babylon boxes already carry
 * per-face (flat) normals, so the silhouette reads hard-faceted with no extra
 * processing — exactly the v1.2 language.
 *
 * The returned `root` is the node the {@link CharacterAnimator} drives (bob /
 * lean / lunge / topple): parent it under the capsule and assign it to
 * `controller.animator.node`, identical to the old GLB wiring.
 */
export interface PlayerAvatar {
  /** Visual root — parent under the capsule and feed to the animator. */
  readonly root: TransformNode
  /** Every part mesh (for pickability / disposal bookkeeping). */
  readonly meshes: readonly Mesh[]
  dispose(): void
}

// ─── Palette ─────────────────────────────────────────────────────────────────
// Muted, earthy, harmonised with the forest prop materials (bark/leaf/stone) so
// the survivor reads as part of the same world. The brown bomber jacket keeps
// continuity with the retired hero GLB concept.
const JACKET = new Color3(0.45, 0.22, 0.15) // rust-brown bomber jacket
const SKIN = new Color3(0.7, 0.52, 0.42) // muted face
const HAIR = new Color3(0.26, 0.24, 0.24) // dark grey crop
const PANTS = new Color3(0.33, 0.33, 0.24) // olive-grey trousers
const BOOTS = new Color3(0.2, 0.14, 0.1) // dark leather
const GLOVES = new Color3(0.22, 0.17, 0.13) // dark wraps
const STRAP = new Color3(0.3, 0.2, 0.12) // satchel strap

/** A matte, near-zero-specular material so parts read flat-shaded, not plastic. */
function matte(scene: Scene, name: string, color: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene)
  mat.diffuseColor = color
  mat.specularColor = new Color3(0.03, 0.03, 0.03)
  return mat
}

/**
 * Build the fighter avatar. Heights are in metres with the feet at local y=0, so
 * a caller parents `root` at the capsule's foot offset (e.g. `(0, -0.9, 0)` for
 * a 1.8 m capsule). Built facing +Z (Babylon forward), matching the capsule yaw.
 */
export function buildPlayerAvatar(scene: Scene): PlayerAvatar {
  const root = new TransformNode('playerAvatar', scene)
  const meshes: Mesh[] = []

  const jacketMat = matte(scene, 'avatarJacketMat', JACKET)
  const skinMat = matte(scene, 'avatarSkinMat', SKIN)
  const hairMat = matte(scene, 'avatarHairMat', HAIR)
  const pantsMat = matte(scene, 'avatarPantsMat', PANTS)
  const bootsMat = matte(scene, 'avatarBootsMat', BOOTS)
  const glovesMat = matte(scene, 'avatarGlovesMat', GLOVES)
  const strapMat = matte(scene, 'avatarStrapMat', STRAP)

  const part = (
    name: string,
    size: { w: number; h: number; d: number },
    pos: Vector3,
    mat: StandardMaterial,
    parent: TransformNode,
    rot?: Vector3,
  ): Mesh => {
    const box = MeshBuilder.CreateBox(name, { width: size.w, height: size.h, depth: size.d }, scene)
    box.position = pos
    if (rot) box.rotation = rot
    box.material = mat
    box.isPickable = false
    box.parent = parent
    meshes.push(box)
    return box
  }

  // ── Lower body — legs + boots, staggered (right foot back) for a fighting base.
  part('avatarLegL', { w: 0.17, h: 0.82, d: 0.2 }, new Vector3(0.12, 0.45, 0.05), pantsMat, root)
  part('avatarLegR', { w: 0.17, h: 0.82, d: 0.2 }, new Vector3(-0.13, 0.45, -0.07), pantsMat, root)
  part('avatarBootL', { w: 0.19, h: 0.16, d: 0.3 }, new Vector3(0.12, 0.08, 0.12), bootsMat, root)
  part('avatarBootR', { w: 0.19, h: 0.16, d: 0.3 }, new Vector3(-0.13, 0.08, -0.0), bootsMat, root)

  // ── Upper body — tilted slightly forward from the hips so the idle reads as
  //    "braced", not standing at ease. Torso/head/arms ride this node.
  const chest = new TransformNode('avatarChest', scene)
  chest.parent = root
  chest.position = new Vector3(0, 0.85, 0)
  chest.rotation = new Vector3(0.16, 0, 0)

  part('avatarTorso', { w: 0.44, h: 0.62, d: 0.28 }, new Vector3(0, 0.3, 0), jacketMat, chest)
  // Satchel strap across the back/shoulder — a thin slab rotated diagonally.
  part(
    'avatarStrap',
    { w: 0.08, h: 0.66, d: 0.04 },
    new Vector3(0.02, 0.32, 0.16),
    strapMat,
    chest,
    new Vector3(0, 0, 0.5),
  )

  // ── Head + hair crop.
  part('avatarHead', { w: 0.26, h: 0.27, d: 0.26 }, new Vector3(0, 0.78, 0.02), skinMat, chest)
  part('avatarHair', { w: 0.29, h: 0.12, d: 0.29 }, new Vector3(0, 0.94, 0.0), hairMat, chest)

  // ── Arms in a boxer's guard: upper arm hangs down-and-out from the shoulder,
  //    forearm bent forward-and-up so the fist sits beside the cheek. Placed
  //    directly in chest space (not nested) so the pose is easy to read and tune.
  //    `sx` mirrors the side (+1 = character's right at +x, -1 = left).
  const buildArm = (side: 'L' | 'R', sx: number): void => {
    // Upper arm: from the shoulder down the side, tilted slightly outward.
    part(
      `avatarUpperArm${side}`,
      { w: 0.13, h: 0.36, d: 0.15 },
      new Vector3(sx * 0.32, 0.36, 0.0),
      jacketMat,
      chest,
      new Vector3(0, 0, sx * 0.28),
    )
    // Forearm: bent up and forward toward the face (elbow ~90°).
    part(
      `avatarForearm${side}`,
      { w: 0.12, h: 0.34, d: 0.13 },
      new Vector3(sx * 0.4, 0.56, 0.18),
      jacketMat,
      chest,
      new Vector3(-0.7, 0, sx * 0.18),
    )
    // Fist (glove) raised beside the cheek — the guard read.
    part(
      `avatarFist${side}`,
      { w: 0.16, h: 0.16, d: 0.16 },
      new Vector3(sx * 0.36, 0.72, 0.34),
      glovesMat,
      chest,
    )
  }
  buildArm('R', 1)
  buildArm('L', -1)

  return {
    root,
    meshes,
    dispose: () => {
      root.dispose(false, true)
    },
  }
}
