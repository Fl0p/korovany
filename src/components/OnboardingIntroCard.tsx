import type { RefObject } from 'react'

export interface OnboardingIntroCardProps {
  /** Caravans the player must raid to win this run. */
  objectiveTarget: number
  /** Dismiss the intro and begin playing. */
  onDismiss: () => void
  /** Focus target for the primary dismiss button (modal entry). */
  dismissButtonRef?: RefObject<HTMLButtonElement | null>
}

/**
 * MPG.2 onboarding overlay: objective + controls + win/lose rules shown once
 * when a player starts a fresh run from the faction picker (not Continue/Restart).
 */
export function OnboardingIntroCard({
  objectiveTarget,
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
        <h2 id="onboarding-title">Raid the caravans</h2>
        <p className="onboarding-lead">
          Your goal this run: raid <strong>{objectiveTarget}</strong> caravans and loot their
          cargo. Soldiers guard the roads — defeat them or avoid their patrols.
        </p>

        <section className="onboarding-section" aria-labelledby="onboarding-objective">
          <h3 id="onboarding-objective">Objective</h3>
          <p>
            Raid <strong>{objectiveTarget}</strong> caravans to win. Each caravan adds loot to
            your score. Track progress on the HUD counter.
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
            <strong>Win</strong> when you have raided {objectiveTarget} caravans.
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
