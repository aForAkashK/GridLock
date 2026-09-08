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

import {
  getAuth,
  signInAnonymously,
  type User,
} from '@react-native-firebase/auth';

export type AuthProvider =
  | 'anonymous'
  | 'playGames'
  | 'gameCenter'
  | 'google'
  | 'apple';

export type AuthUser = {
  uid: string;
  isAnonymous: boolean;
  /** True once any durable provider is linked — drives the nudge. */
  hasRecoverableIdentity: boolean;
  providers: AuthProvider[];
};

function toAuthUser(user: User): AuthUser {
  const providers = user.providerData.map((p: { providerId: string }) => {
    switch (p.providerId) {
      case 'google.com':
        return 'google' as const;
      case 'apple.com':
        return 'apple' as const;
      case 'playgames.google.com':
        return 'playGames' as const;
      case 'gc.apple.com':
        return 'gameCenter' as const;
      default:
        return 'anonymous' as const;
    }
  });

  const durable = providers.filter((p: AuthProvider) => p !== 'anonymous');

  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    hasRecoverableIdentity: durable.length > 0,
    providers: durable.length > 0 ? durable : ['anonymous'],
  };
}

/**
 * Signs in anonymously if there is no current user. Call once at launch.
 *
 * Cheap when a user already exists — Firebase restores the session from local
 * storage without a network round-trip, which is why this can sit on the
 * startup path without costing launch time.
 */
export async function ensureSignedIn(): Promise<AuthUser> {
  const auth = getAuth();
  if (auth.currentUser) {
    return toAuthUser(auth.currentUser);
  }
  const credential = await signInAnonymously(auth);
  return toAuthUser(credential.user);
}

export function getCurrentUser(): AuthUser | null {
  const user = getAuth().currentUser;
  return user ? toAuthUser(user) : null;
}

/** The uid the sync queue writes under, or null before sign-in completes. */
export function getCurrentUid(): string | null {
  return getAuth().currentUser?.uid ?? null;
}

/**
 * True once the Firebase project actually has an OAuth client configured.
 *
 * Anonymous auth needs none, but every link path does. Without this guard the
 * link buttons would fail at the provider SDK with an opaque error; better to
 * know we cannot offer it and hide the nudge entirely.
 *
 * TODO(auth): flip to a real check once Google sign-in is enabled in the
 * Firebase console and google-services.json carries an `oauth_client` entry.
 */
export function isAccountLinkingConfigured(): boolean {
  return false;
}

/**
 * Attempts a silent link to the platform gaming identity — Play Games on
 * Android, Game Center on iOS. Shows no UI and must never block the splash;
 * fire it alongside the first level load, not before it.
 *
 * Returns false when unavailable (no Google account, Game Center disabled, or
 * the project has no OAuth client), which is a normal outcome and not an error.
 */
export async function trySilentPlatformLink(): Promise<boolean> {
  if (!isAccountLinkingConfigured()) {
    return false;
  }
  // TODO(auth): Platform.select ->
  //   android: GoogleSignin.signInSilently() with the Play Games scope, then
  //            PlayGamesAuthProvider.credential(serverAuthCode)
  //   ios:     GameCenterAuthProvider.credential()
  //   then linkWithCredential(currentUser, credential)
  return false;
}

export class AccountLinkingUnavailableError extends Error {
  constructor() {
    super(
      'Account linking is not configured: enable Google sign-in in the Firebase ' +
        'console, add the SHA-1 fingerprint, and re-download google-services.json.',
    );
    this.name = 'AccountLinkingUnavailableError';
  }
}

/** Explicit link from the "save your progress" nudge. Shows provider UI. */
export async function linkAccount(
  _provider: 'google' | 'apple',
): Promise<AuthUser> {
  if (!isAccountLinkingConfigured()) {
    throw new AccountLinkingUnavailableError();
  }
  // TODO(auth): linkWithCredential; on 'credential-already-in-use' the player
  // already has a cloud save — offer to switch to it rather than failing.
  throw new AccountLinkingUnavailableError();
}
