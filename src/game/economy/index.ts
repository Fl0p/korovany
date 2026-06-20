/**
 * Economy systems barrel — inventory model + item catalog.
 *
 * Pure, engine-agnostic game logic (no React, no Babylon). The Redux integration
 * lives in `src/store/inventorySlice.ts`; persistence in `src/game/save`.
 */

export {
  ITEMS,
  getItemDef,
  itemName,
  isEquippable,
  type ItemDef,
  type ItemId,
  type KnownItemId,
} from './items'

export {
  createInventory,
  addItem,
  removeItem,
  equipItem,
  unequip,
  listStacks,
  totalItemCount,
  isInventoryEmpty,
  isInventoryState,
  type InventoryState,
  type InventoryStack,
} from './inventory'
