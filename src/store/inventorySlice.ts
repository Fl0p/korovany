import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  addItem,
  createInventory,
  equipItem,
  removeItem,
  unequip,
  type InventoryState,
  type ItemId,
} from '../game/economy'

/**
 * Inventory slice — the shared-state wrapper around the pure inventory model in
 * `src/game/economy`. Reducers delegate to the pure ops and return the fresh
 * state they produce, so all the carry/equip rules live in one tested place.
 *
 * `pickUpLoot` is the integration seam for caravan loot drops (E3.3): the ambush
 * loop dispatches it with the item id + count a defeated caravan dropped.
 * `restoreInventory` overwrites state from a loaded save (Continue).
 */

/** Loot handed to the inventory when a player picks up a caravan drop. */
export interface LootDrop {
  readonly itemId: ItemId
  readonly count: number
}

const initialState: InventoryState = createInventory()

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    /** Collect a caravan loot drop (E3.3) into the inventory. */
    pickUpLoot(state, action: PayloadAction<LootDrop>) {
      return addItem(state, action.payload.itemId, action.payload.count)
    },
    /** Drop / consume `count` (default 1) of an item. */
    dropItem(state, action: PayloadAction<{ itemId: ItemId; count?: number }>) {
      return removeItem(state, action.payload.itemId, action.payload.count ?? 1)
    },
    /** Equip a carried equippable item. */
    equip(state, action: PayloadAction<ItemId>) {
      return equipItem(state, action.payload)
    },
    /** Clear the equipped slot. */
    unequipItem(state) {
      return unequip(state)
    },
    /** Reset to an empty inventory (New Game). */
    resetInventory() {
      return createInventory()
    },
    /** Overwrite inventory from a loaded save (Continue). */
    restoreInventory(_state, action: PayloadAction<InventoryState>) {
      return {
        counts: { ...action.payload.counts },
        equippedItemId: action.payload.equippedItemId,
      }
    },
  },
})

export const { pickUpLoot, dropItem, equip, unequipItem, resetInventory, restoreInventory } =
  inventorySlice.actions
export const inventoryReducer = inventorySlice.reducer
