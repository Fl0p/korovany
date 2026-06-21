# Onboarding intro (MPG.2)

The onboarding intro is the first-run briefing that tells a new player **what
to do** before they wander the forest. It appears as a dismissible overlay when
a player starts a **fresh run** from the faction picker — not when resuming a
save or restarting after win/lose.

## When it shows

| Entry path | Intro shown? |
| --- | --- |
| New Game → faction picker → **Begin** | Yes |
| **Continue** (loaded save) | No |
| Win/lose **Restart** | No |
| Mid-play (no flag) | No |

The flag lives in [`appSlice`](state-management.md): `showOnboardingIntro`. It is
set by `startNewGame({ showIntro: true })` from the faction-picker commit path
and cleared by `dismissOnboardingIntro`, `continueGame`, or `returnToMenu`.

## What it contains

`OnboardingIntroCard` (`src/components/OnboardingIntroCard.tsx`) surfaces:

- The run objective — raid `objectiveTarget` caravans (from `gameSlice`).
- Default controls — WASD move, Shift sprint, Space jump, F attack, M travel,
  Esc pause (matching `src/game/input/bindings.ts`).
- Win/lose rules — objective complete vs HP reaching zero (bleeding drains HP).

Dismiss via **Begin raid** or **Esc**. After dismissal the overlay is gone and
the HUD objective counter remains the persistent progress indicator (MPG.1).

## Related docs

- [Objective & win/lose loop](objective-loop.md) — the goal the intro explains.
- [Input system](input-system.md) — binding codes referenced in the card.
