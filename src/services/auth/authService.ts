/**
 * Authentication — anonymous-first, linkable later (DECISIONS.md D-003).
 *
 * The player is signed in before they ever see a menu, with no login screen.
 * A real account is only ever offered as a way to protect progress, never as
 * a gate on play.
 *
 * Recovery ladder, weakest to strongest:
 *   1. Anonymous UID           — survives uninstall on iOS (Keychain) but NOT
 *                                on Android (SharedPreferences is wiped).
 *   2. Play Games / Game Center — silent, no UI, tied to the device account.
 *                                This is what makes Android reinstalls recover.
 *   3. Google / Apple link      — offered by the milestone nudge. Definitive.
 *
 * Premium entitlement is deliberately NOT in this ladder: it restores through
 * the App Store / Play receipt, independent of Firebase. A player who loses
 * coins never loses what they paid for.
 */

export type AuthProvider = 'anonymous' | 'playGames' | 'gameCenter' | 'google' | 'apple';

export type AuthUser = {
  uid: string;
  isAnonymous: boolean;
  /** True once any durable provider is linked — drives the nudge. */
  hasRecoverableIdentity: boolean;
  providers: AuthProvider[];
};

/** Signs in anonymously if there is no current user. Call once at launch. */
export async function ensureSignedIn(): Promise<AuthUser> {
  // TODO(auth): auth().currentUser ?? auth().signInAnonymously()
  throw new Error('Not implemented');
}

/**
 * Attempts a silent link to the platform gaming identity — Play Games on
 * Android, Game Center on iOS. Shows no UI and must never block the splash;
 * fire it alongside the first level load, not before it.
 *
 * Returns false when unavailable (no Google account, Game Center disabled),
 * which is a normal outcome and not an error.
 */
export async function trySilentPlatformLink(): Promise<boolean> {
  // TODO(auth): Platform.select ->
  //   android: GoogleSignin.signInSilently() w/ Play Games scope
  //            -> auth.PlayGamesAuthProvider.credential(serverAuthCode)
  //   ios:     auth.GameCenterAuthProvider.credential()
  //   then currentUser.linkWithCredential(credential)
  throw new Error('Not implemented');
}

/** Explicit link from the "save your progress" nudge. Shows provider UI. */
export async function linkAccount(_provider: 'google' | 'apple'): Promise<AuthUser> {
  // TODO(auth): linkWithCredential; on 'credential-already-in-use' the player
  // already has a cloud save — offer to switch to it rather than failing.
  throw new Error('Not implemented');
}

export function getCurrentUser(): AuthUser | null {
  // TODO(auth)
  throw new Error('Not implemented');
}
