/** Renderer-owned lifetime for escaped sprites; independent of later moves. */
import type { Vehicle } from '../models/Vehicle';
export function createExitTracker(
  notify: (vehicles: Vehicle[]) => void,
  duration: number,
) {
  type Entry = {
    vehicle: Vehicle;
    timer: ReturnType<typeof setTimeout> | null;
  };
  const entries = new Map<string, Entry>();
  const publish = () =>
    notify([...entries.values()].map((entry) => entry.vehicle));
  return {
    update(previous: Vehicle[], live: Vehicle[]): void {
      const ids = new Set(live.map((vehicle) => vehicle.id));
      let changed = false;
      // Undo/reset restores a live vehicle; cancel its visual exit immediately.
      for (const [id, entry] of entries) {
        if (ids.has(id)) {
          if (entry.timer) {
            clearTimeout(entry.timer);
          }
          entries.delete(id);
          changed = true;
        }
      }
      for (const vehicle of previous) {
        if (ids.has(vehicle.id)) {
          continue;
        }
        const old = entries.get(vehicle.id);
        if (old?.timer) {
          clearTimeout(old.timer);
        }
        const entry: Entry = { vehicle, timer: null };
        entry.timer = setTimeout(() => {
          if (entries.get(vehicle.id) !== entry) {
            return;
          }
          entries.delete(vehicle.id);
          publish();
        }, duration);
        entries.set(vehicle.id, entry);
        changed = true;
      }
      if (changed) {
        publish();
      }
    },
    dispose(): void {
      entries.forEach((entry) => {
        if (entry.timer) {
          clearTimeout(entry.timer);
        }
      });
      entries.clear();
    },
  };
}
