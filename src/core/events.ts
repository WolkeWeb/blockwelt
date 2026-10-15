/**
 * Typisierter Event-Bus.
 *
 * Kleiner, gemeinsam genutzter Baustein: Die Spiellogik meldet darüber Ereignisse an die Oberfläche
 * (siehe `GameEvents` in `core/game.ts`). Jeder Bereich darf ihn auch intern verwenden.
 *
 * @module core/events
 */

import type { Unsubscribe } from './types';

/**
 * Event-Bus für eine Event-Tabelle `E` (Ereignisname → Typ der Nutzdaten).
 *
 * ```ts
 * interface MyEvents { hit: { damage: number }; reset: void }
 * const bus = createEventBus<MyEvents>();
 * const off = bus.on('hit', (e) => console.log(e.damage));
 * bus.emit('hit', { damage: 2 });
 * off();
 * ```
 */
export interface EventBus<E extends object> {
  /** Meldet einen Listener an. Gibt eine Funktion zum Abmelden zurück. */
  on<K extends keyof E>(type: K, listener: (payload: E[K]) => void): Unsubscribe;
  /** Wie `on`, aber der Listener wird nach dem ersten Aufruf automatisch abgemeldet. */
  once<K extends keyof E>(type: K, listener: (payload: E[K]) => void): Unsubscribe;
  /** Meldet einen Listener ab (falls angemeldet). */
  off<K extends keyof E>(type: K, listener: (payload: E[K]) => void): void;
  /**
   * Ruft alle Listener synchron in Anmelde-Reihenfolge auf. Wirft ein Listener, werden die übrigen
   * trotzdem aufgerufen und der Fehler per `console.error` gemeldet.
   */
  emit<K extends keyof E>(type: K, payload: E[K]): void;
  /** Entfernt alle Listener. */
  clear(): void;
}

/** Erzeugt einen leeren Event-Bus. */
export function createEventBus<E extends object>(): EventBus<E> {
  type AnyListener = (payload: never) => void;
  const listeners = new Map<keyof E, Set<AnyListener>>();

  const bus: EventBus<E> = {
    on(type, listener) {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(listener as AnyListener);
      return () => bus.off(type, listener);
    },
    once(type, listener) {
      const wrapper = (payload: E[typeof type]) => {
        off();
        listener(payload);
      };
      const off = bus.on(type, wrapper);
      return off;
    },
    off(type, listener) {
      listeners.get(type)?.delete(listener as AnyListener);
    },
    emit(type, payload) {
      const set = listeners.get(type);
      if (!set) return;
      for (const listener of [...set]) {
        try {
          (listener as (p: E[typeof type]) => void)(payload);
        } catch (error) {
          console.error(`Fehler in Listener für "${String(type)}":`, error);
        }
      }
    },
    clear() {
      listeners.clear();
    },
  };
  return bus;
}
