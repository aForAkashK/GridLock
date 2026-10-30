/** No SDK dependency: ads must not outrun an account/pass restore. */
let ready = false;
const listeners = new Set<(ready: boolean) => void>();
export function isSaveReady(): boolean {
  return ready;
}
export function setSaveReady(value: boolean): void {
  ready = value;
  listeners.forEach((listener) => listener(value));
}
export function onSaveReady(listener: (ready: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
