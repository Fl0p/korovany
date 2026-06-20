import { describe, expect, it } from 'vitest'
import {
  dropItem,
  equip,
  inventoryReducer,
  pickUpLoot,
  resetInventory,
  restoreInventory,
  unequipItem,
} from './inventorySlice'
import { createInventory, type InventoryState } from '../game/economy'

describe('inventorySlice', () => {
  it('starts empty', () => {
    expect(inventoryReducer(undefined, { type: '@@INIT' })).toEqual(createInventory())
  })

  it('pickUpLoot collects a caravan drop', () => {
    let state = inventoryReducer(undefined, pickUpLoot({ itemId: 'gold', count: 12 }))
    expect(state.counts.gold).toBe(12)
    state = inventoryReducer(state, pickUpLoot({ itemId: 'gold', count: 3 }))
    expect(state.counts.gold).toBe(15)
  })

  it('dropItem removes from a stack', () => {
    const start = inventoryReducer(undefined, pickUpLoot({ itemId: 'grain', count: 4 }))
    const after = inventoryReducer(start, dropItem({ itemId: 'grain', count: 4 }))
    expect('grain' in after.counts).toBe(false)
  })

  it('equip / unequip an equippable item', () => {
    let state = inventoryReducer(undefined, pickUpLoot({ itemId: 'blade', count: 1 }))
    state = inventoryReducer(state, equip('blade'))
    expect(state.equippedItemId).toBe('blade')
    state = inventoryReducer(state, unequipItem())
    expect(state.equippedItemId).toBeNull()
  })

  it('resetInventory clears everything', () => {
    const start = inventoryReducer(undefined, pickUpLoot({ itemId: 'cloth', count: 2 }))
    expect(inventoryReducer(start, resetInventory())).toEqual(createInventory())
  })

  it('restoreInventory overwrites from a save and decouples references', () => {
    const saved: InventoryState = { counts: { gold: 9, blade: 1 }, equippedItemId: 'blade' }
    const state = inventoryReducer(undefined, restoreInventory(saved))
    expect(state).toEqual(saved)
    expect(state.counts).not.toBe(saved.counts)
  })
})
