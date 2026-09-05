/**
 * Analytics — PRD section 28. Not wired for MVP v0.1.
 *
 * A single typed event union rather than free-form strings, so a renamed event
 * is a compile error instead of a silently broken dashboard.
 */

export type AnalyticsEvent =
  | { name: 'level_started'; levelId: number }
  | { name: 'level_completed'; levelId: number; moves: number; seconds: number }
  | { name: 'level_abandoned'; levelId: number; moves: number }
  | { name: 'hint_used'; levelId: number }
  | { name: 'undo_used'; levelId: number }
  | { name: 'reset_used'; levelId: number }
  | { name: 'skip_used'; levelId: number }
  | { name: 'coins_earned'; amount: number; reason: string }
  | { name: 'coins_spent'; amount: number; reason: string }
  | { name: 'rewarded_ad_watched' }
  | { name: 'premium_viewed' }
  | { name: 'premium_purchased' }
  | { name: 'account_linked'; provider: string };

export function track(_event: AnalyticsEvent): void {
  // TODO(analytics): v0.2 — must be fire-and-forget, never awaited.
}
