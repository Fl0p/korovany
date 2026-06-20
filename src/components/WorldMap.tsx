import { useState } from 'react'
import type { ZoneDefinition, ZoneId } from '../game/world'

/** Travel lifecycle the overlay reflects: idle, in-flight (scene streaming), or failed. */
export type TravelStatus = 'idle' | 'loading' | 'error'

export interface WorldMapProps {
  /** All world zones, in display order. */
  zones: readonly ZoneDefinition[]
  /** Zone the player is currently in (gets the "You are here" marker). */
  currentZoneId: string
  /** Travel lifecycle for the loading / error states. */
  status?: TravelStatus
  /** Commit fast-travel to an available, non-current zone. */
  onTravel: (zoneId: ZoneId) => void
  /** Dismiss the overlay without travelling. */
  onClose: () => void
}

/**
 * World-map / fast-travel overlay (E3.1). Lists the four zones, marks the
 * current one, disables locked and current zones, and uses a two-step
 * select→confirm affordance so a stray click never teleports the player.
 *
 * Built against the E3.1-UX requirements (current-zone indicator, available vs
 * locked, confirm/cancel, empty/loading/error states, 1280×800). Visual polish
 * tracks Iris's wireframes; this is the functional first pass.
 */
export function WorldMap({ zones, currentZoneId, status = 'idle', onTravel, onClose }: WorldMapProps) {
  const [selected, setSelected] = useState<ZoneId | null>(null)
  const busy = status === 'loading'

  const selectedZone = selected ? zones.find((z) => z.id === selected) ?? null : null

  return (
    <div
      className="worldmap-overlay"
      role="dialog"
      aria-labelledby="worldmap-title"
      aria-modal="true"
    >
      <div className="worldmap-panel">
        <header className="worldmap-header">
          <h2 id="worldmap-title">World map</h2>
          <button
            type="button"
            className="worldmap-close"
            onClick={onClose}
            aria-label="Close world map"
          >
            ✕
          </button>
        </header>

        {zones.length === 0 ? (
          <p className="worldmap-empty">No zones are available to travel to yet.</p>
        ) : (
          <ul className="worldmap-zones" aria-label="Travel destinations">
            {zones.map((zone) => {
              const isCurrent = zone.id === currentZoneId
              const isLocked = zone.status === 'locked'
              const isSelected = zone.id === selected
              const disabled = isCurrent || isLocked || busy
              return (
                <li key={zone.id}>
                  <button
                    type="button"
                    className={`worldmap-zone${isSelected ? ' is-selected' : ''}${
                      isCurrent ? ' is-current' : ''
                    }`}
                    onClick={() => setSelected(zone.id)}
                    disabled={disabled}
                    aria-disabled={disabled}
                    aria-pressed={isSelected}
                  >
                    <span className="worldmap-zone-name">{zone.displayName}</span>
                    <span className="worldmap-zone-lore">{zone.loreName}</span>
                    <span className="worldmap-zone-owner">{zone.ownerLabel}</span>
                    {isCurrent ? (
                      <span className="worldmap-badge worldmap-badge-here">You are here</span>
                    ) : isLocked ? (
                      <span className="worldmap-badge worldmap-badge-locked">Locked</span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <footer className="worldmap-footer" aria-live="polite">
          {status === 'error' ? (
            <p className="worldmap-error" role="alert">
              Travel failed — the zone could not be loaded. Try again.
            </p>
          ) : busy ? (
            <p className="worldmap-status">Travelling…</p>
          ) : selectedZone ? (
            <div className="worldmap-confirm">
              <span>Travel to {selectedZone.displayName}?</span>
              <button
                type="button"
                className="primary-action"
                onClick={() => onTravel(selectedZone.id)}
              >
                Travel
              </button>
              <button type="button" onClick={() => setSelected(null)}>
                Cancel
              </button>
            </div>
          ) : (
            <p className="worldmap-hint">Select a zone to travel.</p>
          )}
        </footer>
      </div>
    </div>
  )
}
