# Awards — initial release

10 fixed achievements,950 coins total,each reward collected once from Awards on Home.

| Achievement | Goal | Coins |
|---|---|---:|
| First Escape | Complete1 level | 25 |
| Traffic Tamer | Complete10 levels | 50 |
| Puzzle Pro | Complete25 levels | 100 |
| Halfway Hero | Complete50 levels | 150 |
| Road Master | Complete100 levels | 300 |
| Perfect Start | Solve1 different level at par or better | 25 |
| Clean Run | Solve5 different levels at par or better | 50 |
| Perfect Route | Solve10 different levels at par or better | 100 |
| Daily Driver | Claim daily coins3 days consecutively | 50 |
| Week Champion | Claim daily coins7 days consecutively | 100 |

Completion milestones read existing unique completed IDs,including skips. Perfect IDs start tracking with this update because historical move counts were never saved. Replaying a completed level can record a first perfect; repeating a recorded perfect adds nothing. Only real won boards with no vehicles remaining and matching level IDs count; skips and preview mode are excluded. Daily goals use the highest observed claim streak,initialized from the saved current receipt,and keep it after a missed day.

## Local and cloud behavior

- `services/awards/catalog.ts`: stable award IDs/goals/prices. Never recycle a shipped ID for a different payout.
- `policy.ts`: pure bounded normalization,evaluation,unique-ID unions and high-water merges.
- `storage.ts`: record legitimate perfects and capture daily high-water state. It performs no coin awarding.
- `awardService.ts` and `ledger.ts`: synchronous eligibility check and durable MMKV claim intent before balance/version/receipt writes. Retry/recovery replays the same resulting values,not another increment.
- Coin reads,sync flush,startup and account recovery repair pending claims. Repair must occur before comparing cloud coin versions,so a later coin read cannot replay an older intent over a newer cloud balance.
- Sync includes `awardsProgress`. Union perfect IDs/claimed receipt IDs,and max daily high-water state. Merge award history BEFORE replacing daily receipts,so an older7-day local streak is retained when a newer cloud receipt has restarted at1.
- Account recovery adopts existing cloud coins and unions achievement facts/receipts. It never adds two balances or re-grants a collected award. Valid future receipt IDs are preserved by older clients without exposing unknown awards. Snapshot bounds:2000 perfect IDs and256 claim IDs.

No claim awaits the network. No new backend function,SDK or package. This uses the existing owner-scoped Firebase player save. As with the current coin ledger,this is not fraud-proof or globally exactly-once across concurrently offline devices. Trusted reward/purchase verification is required before real-money currency sales.

## Presentation / acceptance

Awards uses the existing clean city background,trophy tile,shared Back button,CoinPill and bundled display font. No new art download or extra font. The ten-card list is virtualized. Home's dot indicates a collectable reward; accessibility hints announce it. Collected states use text/colour,not tick marks.

Run TypeScript,lint,Jest and `audit:assets`. Tests cover all thresholds,unique replays,invalid/skipped/non-won results,duplicate taps,interruption at each claim write,missed-day preservation,cloud recovery and forward receipt compatibility. The Android performance APK embeds the bundle without preview/debug controls for device testing.
