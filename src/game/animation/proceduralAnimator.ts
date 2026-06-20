/**
 * Procedural character animation — pure math, no Babylon dependency.
 *
 * Produces per-frame Y-bob, forward-lean, attack-lunge, and death-topple
 * offsets that callers apply to a visual root TransformNode each tick.
 *
 * All inputs/outputs are plain numbers so this module is testable with
 * Vitest/NullEngine without a browser or WebGL context.
 */

import type { AttackPhase } from '../combat/meleeAttack'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnimatorState {
  /** Continuously-running phase accumulator for periodic signals. */
  time: number
  /** True on the last tick when dead was first detected (single-frame gate). */
  dead: boolean
  /** 0 = upright, 1 = fully toppled; progresses while dead = true. */
  toppleProgress: number
}

export interface AnimatorInput {
  /** dt in seconds — must respect the caller's time-scale (i.e. engine.timeScale). */
  dt: number
  /** Magnitude of the horizontal velocity (0 = standing still). */
  speed: number
  /** Current melee attack phase from stepMeleeAttack. */
  attackPhase: AttackPhase
  /** Character has died (HP ≤ 0). */
  isDead: boolean
}

export interface AnimatorOutput {
  /** Vertical bob offset — add to visual root's local Y. */
  bobY: number
  /** Forward lean — set as visual root's local X rotation (radians). */
  leanX: number
  /** Forward lunge — add to visual root's local Z translation. */
  lungeZ: number
  /** Death topple — set as visual root's local Z rotation (radians, 0→π/2). */
  toppleZ: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Idle: slow, shallow bob. */
const IDLE_BOB_AMP = 0.025  // metres
const IDLE_BOB_FREQ = 1.1   // Hz

/** Moving: faster, deeper bob + forward lean. */
const MOVE_BOB_AMP = 0.055
const MOVE_BOB_FREQ = 2.4   // Hz (run cadence)
const MOVE_LEAN_MAX = 0.12  // radians

/** Attack lunge: max forward displacement at active window midpoint. */
const LUNGE_MAX = 0.18      // metres
/** Speed at which topple completes (fraction of π/2 per second). */
const TOPPLE_RATE = 3.0     // reaches π/2 in ~0.52 s

// ─── State ───────────────────────────────────────────────────────────────────

export function createAnimatorState(): AnimatorState {
  return { time: 0, dead: false, toppleProgress: 0 }
}

// ─── Step ────────────────────────────────────────────────────────────────────

/**
 * Advance the animator by one tick.
 *
 * Returns the new state and the frame's output offsets.  Callers apply the
 * offsets to the visual root (not the physics capsule) each frame.
 */
export function stepAnimator(
  state: AnimatorState,
  input: AnimatorInput,
): { state: AnimatorState; output: AnimatorOutput } {
  const { dt, speed, attackPhase, isDead } = input

  // ── Death topple ─────────────────────────────────────────────────────────
  if (isDead) {
    const toppleProgress = Math.min(1, state.toppleProgress + TOPPLE_RATE * dt)
    // Ease-out: fast start, slow finish
    const t = 1 - (1 - toppleProgress) ** 2
    return {
      state: { time: state.time, dead: true, toppleProgress },
      output: {
        bobY: 0,
        leanX: 0,
        lungeZ: 0,
        toppleZ: (Math.PI / 2) * t,
      },
    }
  }

  // ── Time advance ─────────────────────────────────────────────────────────
  const time = state.time + dt

  // ── Bob ──────────────────────────────────────────────────────────────────
  const isMoving = speed > 0.05
  const bobAmp = isMoving ? MOVE_BOB_AMP : IDLE_BOB_AMP
  const bobFreq = isMoving ? MOVE_BOB_FREQ : IDLE_BOB_FREQ
  const bobY = bobAmp * Math.sin(2 * Math.PI * bobFreq * time)

  // ── Lean ─────────────────────────────────────────────────────────────────
  // Lean proportional to speed, max at sprint (speed ~5+ m/s).
  const leanX = isMoving ? MOVE_LEAN_MAX * Math.min(speed / 4, 1) : 0

  // ── Lunge ────────────────────────────────────────────────────────────────
  // Windup: small pullback; active: full lunge; recovery: fade out
  let lungeZ = 0
  if (attackPhase === 'windup') {
    lungeZ = -0.05  // slight pullback telegraphs the swing
  } else if (attackPhase === 'active') {
    lungeZ = LUNGE_MAX
  } else if (attackPhase === 'recovery') {
    lungeZ = LUNGE_MAX * 0.4  // partial extension lingers
  }

  return {
    state: { time, dead: false, toppleProgress: 0 },
    output: { bobY, leanX, lungeZ, toppleZ: 0 },
  }
}

// ─── Babylon-optional binding ─────────────────────────────────────────────────

/**
 * Thin wrapper that holds a reference to a visual root node and applies
 * animator output each frame.
 *
 * The `node` reference is set after async GLB load completes, so it may be
 * null on early frames — the animator silently skips when that happens.
 *
 * Typed against the minimal positional/rotational interface so tests can inject
 * a plain object without importing Babylon.
 */
export interface AnimatableNode {
  position: { y: number; z: number }
  rotation: { x: number; z: number }
}

export class CharacterAnimator {
  private state: AnimatorState
  node: AnimatableNode | null = null

  /** Base Y of the node at spawn (restored each frame so offsets don't drift). */
  baseY: number
  /** Base Z of the node at spawn. */
  baseZ: number

  constructor(baseY = 0, baseZ = 0) {
    this.state = createAnimatorState()
    this.baseY = baseY
    this.baseZ = baseZ
  }

  update(input: AnimatorInput): void {
    const { state, output } = stepAnimator(this.state, input)
    this.state = state
    if (!this.node) return
    this.node.position.y = this.baseY + output.bobY
    this.node.position.z = this.baseZ + output.lungeZ
    this.node.rotation.x = output.leanX
    this.node.rotation.z = output.toppleZ
  }
}
