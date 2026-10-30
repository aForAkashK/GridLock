# Google Play submission — 1.0 (1)

Updated: 2026-10-31. This is a submission record, not a claim that production is live.

## Console and release

- App: **Freeway Escape: Traffic Puzzle**, `com.akssoft.gridlock`.
- Developer: **Aks Soft Tech**; public brand **AksSoft**.
- [App dashboard](https://play.google.com/console/u/0/developers/4779735645125099136/app/4973097002052597042/app-dashboard).
- Internal release **1.0 (1) - Internal testing** is published and active. The existing **Personal Test** list (21 accounts) is selected. No invitations were sent.
- [Internal test opt-in](https://play.google.com/apps/internaltest/4701417800942151050). Only eligible tester accounts can join.
- Google accepted the signed AAB with ReTrace mapping and native debug symbols. Its estimated new-install download was **22.3 MB**; actual size depends on the device.
- Production is gated by a closed test: **at least 12 opted-in testers for 14 continuous days**, followed by an application for production access. Internal testing does not count toward this gate.
- Existing closed track: **Alpha**, ID `4699380631041088895`; not yet published as of this record.

## App information

Saved: privacy policy, app access, target audience (13–15, 16–17, 18+), non-government declaration, no financial features, no health features, Puzzle category, public contact details, and Data safety. Ads is marked completed on the dashboard; verify its stored answer is **Yes** before review submission.

- Support: `akssoft.feedback@gmail.com`.
- Website: https://portfolio-akash-kr.vercel.app/
- Privacy: https://gridlock-bee41-levels.web.app/privacy.html
- Account deletion: https://gridlock-bee41-levels.web.app/delete-account.html
- Core play is available anonymously; Google connection is optional for recovery.
- IARC rating is **pending**. Contact and Game category are prepared. The owner chose to review/accept IARC's Terms of Use personally; do not accept them on the owner's behalf without subsequent authorization.

## Store media and copy

Copy source: [STORE_LISTING.md](STORE_LISTING.md). Private upload packet: `.local-release/play-store/1.0-1/` (ignored by Git).

- Approved game icon exported as a 512×512 RGBA PNG.
- Generated feature graphic exported as a 1024×500 RGB PNG; original source retained.
- Seven 1080×1920 RGB phone images use actual native app screenshots with caption frames: Home, 6×6 gameplay, 7×7 gameplay, 8×8 gameplay, Daily rewards, Shop, Inventory.
- Captures preserve the game image and use uniform scaling. Gameplay previews did not spend coins or advance the player's save. Emulator display settings and normal build were restored after capture.
- All nine upload images passed dimension/format/size checks; hashes are in `media-manifest.json` in the packet. These marketing files are not included in the runtime asset bundle.
- Media uploaded and ordered `store-01.png` through `store-07.png` in the listing review form. Listing submission is **pending owner review**, not yet confirmed saved.
- Owner chose to review the AI declaration in Console personally. Prepared selection labels the generated icon and feature graphic; the real app captures remain unlabeled. Automatic approval review blocked submitting this declaration without the owner's exact approval. Do not bypass that block.

## Saved Data safety mapping

All listed types are declared collected and non-ephemeral. Firebase service-provider processing is distinguished from the advertising SDK's sharing.

| Type | Shared | Optional collection | Collection purposes |
| --- | --- | --- | --- |
| Approximate location (AdMob IP-derived location) | Yes | No | Analytics; advertising/marketing; fraud prevention/security/compliance |
| Name (optional Google provider profile) | No | Yes | Account management |
| Email address (optional Google provider profile) | No | Yes | Account management |
| User IDs (guest/linked player identity and diagnostic support identifier) | No | No | App functionality; analytics; account management |
| App interactions | Yes | No | Analytics; advertising/marketing; fraud prevention/security/compliance |
| Other actions (game progress/cloud save and diagnostic game context) | No | No | App functionality; analytics |
| Crash logs | No | Yes | Analytics |
| Diagnostics | Yes | No | Analytics; advertising/marketing; fraud prevention/security/compliance |
| Device or other IDs | Yes | No | Analytics; advertising/marketing; fraud prevention/security/compliance |

Shared-data purposes match the three advertising-SDK purposes above. Crash collection is optional via Settings; advertising-SDK diagnostics and installation identifiers have separate handling. The Google profile's email/name are handled by Firebase Authentication even though the custom player document does not copy them.

Encrypted in transit: **Yes**. Account methods: **OAuth** and **Other**, described as automatic anonymous guest accounts with optional Google connection. Full-account deletion URL supplied. A separate partial-data-deletion feature is not claimed. No independent security or UPI badge is claimed. No financial, health, contacts, camera, microphone, precise location, or real-money purchase data is claimed.

Console showed **Change saved. Send for review in Publishing overview.** Evidence is retained as `data-safety-saved.png` and `data-safety-preview.txt`. CSV export did not return a download through browser automation; no CSV export is claimed.

Sources used for the SDK mapping: [Firebase disclosures](https://firebase.google.com/docs/android/play-data-disclosure), [Google Mobile Ads disclosures](https://developers.google.com/admob/android/privacy/play-data-disclosure), [Play data definitions](https://support.google.com/googleplay/android-developer/answer/10787469).

## Play-signed Google recovery

Registered all three Play app-signing certificate variants in the existing Firebase Android app, including SHA-1 and SHA-256. Verified all six hashes in Firebase and matching Android OAuth clients for all three SHA-1s. Existing debug/upload entries remain.

- Firebase app: `1:623404704918:android:41734828cac486be314eb7`, project `gridlock-bee41`.
- Primary Play SHA-1: `B8:CA:FA:9E:46:31:62:0B:1F:76:7A:94:7B:55:CE:89:D7:B8:29:8D`.
- Complete certificate set and verification results are in `play-signing-fingerprints.json`, `firebase-signing-certificates.json`, and `google-signin-verification.json` in the private packet.
- Downloaded the updated configuration and refreshed the ignored local `android/app/google-services.json`. An assertion confirmed that only OAuth client metadata changed; the existing web client, app/project identifiers and API configuration are unchanged. The already uploaded binary continues using that same web client.
- **Still required:** sign in/recover through an actual Play-installed build using the owner's own account. Certificate registration alone is not an end-to-end sign-in test.

## Before production

1. Owner completes the prepared AI asset review and IARC Terms acceptance. Finish the content questions and save the listing; check actual ratings rather than inferring them from intended audience.
2. Finish/publish the closed test after Console validation. Obtain the closed-test opt-in link; it is different from the internal link above.
3. Recruit at least 12 testers and keep them opted in continuously for at least 14 days. Record real feedback/issues and fixes for the production-access application.
4. Test the Play-installed build, including Google recovery, deletion, offline progress, ads/rewards/pass expiry and diagnostic visibility/alerts. See [DIAGNOSTICS_QA_2026-10-30.md](DIAGNOSTICS_QA_2026-10-30.md).
5. Production ads remain disabled intentionally: `ads.config.json` is **test**. Activating production IDs requires a new versionCode and newly built/uploaded AAB, plus production consent/AdMob verification. No real-money purchases are enabled in this release.
6. Keep private signing credentials backed up outside the repository. Never upload the whole private packet or diagnostic/signing files as store artwork.
