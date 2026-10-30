/** Durable deletion sequencing, independent of native SDKs for failure testing. */
export type DeletionIntent = { uid: string; stage: "cloud" | "auth" | "local" };
export function deletionIntent(value: unknown): DeletionIntent | null {
  if (!value || typeof value !== "object") return null;
  const intent = value as Partial<DeletionIntent>;
  return typeof intent.uid === "string" &&
    /^[a-zA-Z0-9:_-]{1,128}$/.test(intent.uid) &&
    (intent.stage === "cloud" ||
      intent.stage === "auth" ||
      intent.stage === "local")
    ? { uid: intent.uid, stage: intent.stage }
    : null;
}
export type DeletionPort = {
  read: () => DeletionIntent | null;
  write: (intent: DeletionIntent) => void;
  uid: () => string | null;
  verify: (uid: string) => Promise<void>;
  removeCloud: (uid: string) => Promise<void>;
  removeAuth: (uid: string) => Promise<void>;
  clearLocal: () => void;
  finish: () => void;
};
export async function runDeletion(port: DeletionPort): Promise<void> {
  let intent = port.read();
  if (!intent) {
    const uid = port.uid();
    if (!uid) throw new Error("deletion/no-user");
    // Cancellation or wrong-account selection must leave data untouched.
    await port.verify(uid);
    if (port.uid() !== uid) throw new Error("deletion/account-changed");
    intent = { uid, stage: "cloud" };
    port.write(intent);
  } else if (intent.stage !== "local" && port.uid() === intent.uid) {
    await port.verify(intent.uid);
  }
  if (intent.stage === "cloud") {
    if (port.uid() !== intent.uid) throw new Error("deletion/account-changed");
    await port.removeCloud(intent.uid);
    intent = { ...intent, stage: "auth" };
    port.write(intent);
  }
  if (intent.stage === "auth") {
    const uid = port.uid();
    if (uid && uid !== intent.uid) throw new Error("deletion/account-changed");
    // Firebase clears currentUser when Auth deletion succeeds, including if
    // the process stopped before the local stage was persisted.
    if (uid) await port.removeAuth(intent.uid);
    intent = { ...intent, stage: "local" };
    port.write(intent);
  }
  if (port.uid() !== null) throw new Error("deletion/account-changed");
  port.clearLocal();
  port.finish(); // Remove journal last; interrupted local cleanup is replayable.
}
