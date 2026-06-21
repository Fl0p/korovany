import type { Vec3 } from '../combat'

export const HEALING_CHEST_RADIUS = 2.25
export const HEALING_CHEST_AMOUNT = 5
export const HEALING_CHEST_COOLDOWN_SECONDS = 0.5

export interface HealingChestSpec {
  readonly id: string
  readonly position: Vec3
  readonly radius?: number
  readonly healAmount?: number
  readonly cooldownSeconds?: number
}

export interface HealingChestState {
  readonly id: string
  readonly cooldownRemaining: number
}

export interface HealingChestTick {
  readonly states: readonly HealingChestState[]
  readonly healAmount: number
  readonly activeChestIds: readonly string[]
}

export function createHealingChestStates(
  specs: readonly HealingChestSpec[],
): readonly HealingChestState[] {
  return specs.map((spec) => ({ id: spec.id, cooldownRemaining: 0 }))
}

function distanceSq2d(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return dx * dx + dz * dz
}

export function isInsideHealingChest(player: Vec3, chest: HealingChestSpec): boolean {
  const radius = chest.radius ?? HEALING_CHEST_RADIUS
  return distanceSq2d(player, chest.position) <= radius * radius
}

export function tickHealingChests(
  specs: readonly HealingChestSpec[],
  states: readonly HealingChestState[],
  player: Vec3,
  dt: number,
): HealingChestTick {
  const activeChestIds: string[] = []
  let healAmount = 0

  const nextStates = specs.map((spec) => {
    const prior = states.find((state) => state.id === spec.id)
    const cooledDown = Math.max(0, (prior?.cooldownRemaining ?? 0) - dt)
    if (!isInsideHealingChest(player, spec) || cooledDown > 0) {
      return { id: spec.id, cooldownRemaining: cooledDown }
    }

    activeChestIds.push(spec.id)
    healAmount += spec.healAmount ?? HEALING_CHEST_AMOUNT
    return {
      id: spec.id,
      cooldownRemaining: spec.cooldownSeconds ?? HEALING_CHEST_COOLDOWN_SECONDS,
    }
  })

  return { states: nextStates, healAmount, activeChestIds }
}
