# Account deletion

Public fallback page: https://gridlock-bee41-levels.web.app/delete-account.html
Approved public inbox: akssoft.feedback@gmail.com

## In-app deletion

Settings → Save your progress → Delete account → Delete permanently.
Google-linked players reauthenticate with the same Google account; anonymous players refresh their Firebase token. Cancelling verification has no destructive effects. No Google account is deleted.

The durable journal `auth.pendingAccountDeletion.v1` records cloud/auth/local stages. Once started, the global gate blocks play and sync/bootstrap skip uploads and merges. A Firestore server transaction atomically creates immutable `deletedPlayers/{uid}` with `deletedAt: serverTimestamp()` and deletes `players/{uid}`. Rules restrict this to the owner and reject further reads/creates/updates of the player save, including stale sessions from other devices. No progress/email is retained in the marker; its UID/time is retained solely to prevent save resurrection and is disclosed in confirmation/public policy. Firebase Auth deletion follows the transaction, then this device's local player records/history/journals/settings are cleared. The journal clears last. Retry resumes a partial operation; success is shown only after all stages. Continue explicitly starts a new game.

No custom backend, package or native dependency added. The server rules must be deployed with the app. Other installed devices' local records cannot be remotely erased; users should clear storage/uninstall them. Provider-managed logs/backups follow provider retention. Revisit the marker's security necessity as the account/session model evolves.

## Without the app / manual requests

The web email link opens a draft, not a submitted form. The player must send it. AksSoft must monitor and process the inbox; the email route has no automatic confirmation or48-hour promise.

1. Verify Freeway Escape (`gridlock-bee41`), not Dearfuture. Match the linked Google email and Player ID against Firebase Authentication. A UID alone is not proof of ownership; do not delete guessed anonymous accounts. Never request passwords/tokens.
2. Obtain explicit confirmation of permanent loss and ask the player to stop using installed copies during processing.
3. Using authorized Firebase admin tools, atomically create `deletedPlayers/{uid}` (if absent) with deletion timestamp and remove `players/{uid}`. Do not remove the security marker while stale sessions could still upload. Inspect future collections/subcollections before claiming all game data is removed.
4. Delete that verified user's Firebase Authentication record and confirm the cloud player document is absent. Do not export the save as part of deletion.
5. Reply with completion, the security-marker/provider retention disclosure and instructions to clear other local copies. Minimize retained request correspondence and remove completed records when no longer needed.

## Verification

- Jest covers verification cancellation, identity changes, cloud/Auth failures, interrupted journal stages and local cleanup, malformed journals and bootstrap blocking.
- `tools/auth/verify-deletion-rules.mjs` creates/deletes only disposable accounts in the isolated `demo-gridlock-deletion` Auth/Firestore emulators. It refuses non-local endpoints. Tests owner/foreign access, malformed marker, atomic cleanup, immutable marker, safe retry, unrelated-account sync, Auth deletion and stale-token write rejection.
- Requires Firebase CLI and Java21 for current emulators:
  `firebase emulators:exec --config firebase.deletion-emulators.json --project demo-gridlock-deletion --only auth,firestore 'node tools/auth/verify-deletion-rules.mjs'`
- Native normal-app QA only opens and cancels the confirmation. Do not delete the publisher's save. Human Google reauthentication/deletion acceptance should use a disposable account.
