import type { RefObject } from 'react'

export interface OnboardingIntroCardProps {
  /** Number of worlds the player must conquer to win the campaign (ADR 0005). */
  worldCount: number
  /** Display name of the first world (the New-Game spawn, e.g. "Forest"). */
  firstZoneName: string
  /** Caravans the player must raid to conquer the first world. */
  firstZoneQuota: number
  /** Dismiss the intro and begin playing. */
  onDismiss: () => void
  /** Focus target for the primary dismiss button (modal entry). */
  dismissButtonRef?: RefObject<HTMLButtonElement | null>
}

/**
 * MPG.2 onboarding overlay: objective + controls + win/lose rules shown once
 * when a player starts a fresh run from the faction picker (not Continue/Restart).
 *
 * The objective is the world-conquest campaign (ADR 0005): raid each world's
 * caravan quota to conquer it, and conquer every world to win.
 */
export function OnboardingIntroCard({
  worldCount,
  firstZoneName,
  firstZoneQuota,
  onDismiss,
  dismissButtonRef,
}: OnboardingIntroCardProps) {
  return (
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-labelledby="onboarding-title"
      aria-modal="true"
    >
      <div className="onboarding-panel menu-panel">
        <p className="menu-kicker">Forest raid</p>
        <h2 id="onboarding-title">Conquer the worlds</h2>
        <p className="onboarding-lead">
          Your campaign goal: <strong>conquer all {worldCount} worlds</strong> by raiding their
          caravans. Start in the {firstZoneName} — raid <strong>{firstZoneQuota}</strong> caravans
          to conquer it, then march on the next world. Soldiers guard the roads — defeat them or
          avoid their patrols.
        </p>

        <section className="onboarding-section" aria-labelledby="onboarding-objective">
          <h3 id="onboarding-objective">Objective</h3>
          <p>
            Raid a world's caravans to conquer it. Conquer every world to win the campaign. Track
            worlds conquered and the current world's progress on the HUD counter; each caravan also
            adds loot to your score.
          </p>
        </section>

        <section className="onboarding-section" aria-labelledby="onboarding-controls">
          <h3 id="onboarding-controls">Controls</h3>
          <ul className="onboarding-controls">
            <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</li>
            <li><kbd>Shift</kbd> Sprint</li>
            <li><kbd>Space</kbd> Jump</li>
            <li><kbd>F</kbd> Attack</li>
            <li><kbd>M</kbd> Travel — open the world map</li>
            <li><kbd>Esc</kbd> Pause</li>
          </ul>
        </section>

        <section className="onboarding-section" aria-labelledby="onboarding-outcome">
          <h3 id="onboarding-outcome">Win or lose</h3>
          <p>
            <strong>Win</strong> when you have conquered all {worldCount} worlds.
            <strong>Lose</strong> if your health reaches zero — untreated bleeding drains HP
            over time.
          </p>
        </section>

        <div className="menu-actions" aria-label="Onboarding actions">
          <button
            ref={dismissButtonRef}
            type="button"
            className="primary-action"
            onClick={onDismiss}
          >
            Begin raid
          </button>
        </div>
      </div>
    </div>
  )
}
