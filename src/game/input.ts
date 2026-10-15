/**
 * Tastatur- und Maus-Eingaben. Merkt sich gedrückte Tasten (per `KeyboardEvent.code`, also unabhängig vom
 * Tastaturlayout) und sammelt Mausbewegungen, solange der Pointer-Lock aktiv ist.
 */
export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;
  private wheel = 0;
  private readonly cleanup: (() => void)[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    const on = <K extends keyof WindowEventMap>(type: K, handler: (event: WindowEventMap[K]) => void) => {
      window.addEventListener(type, handler);
      this.cleanup.push(() => window.removeEventListener(type, handler));
    };
    on('keydown', (event) => {
      // Browser-Kürzel abfangen, die das Spiel selbst belegt
      if (event.code === 'F3' || (this.locked && (event.code === 'Space' || event.ctrlKey))) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.down.add(event.code);
    });
    on('keyup', (event) => this.down.delete(event.code));
    on('blur', () => this.down.clear());
    on('mousemove', (event) => {
      if (!this.locked) return;
      this.mouseDX += event.movementX;
      this.mouseDY += event.movementY;
    });
    on('wheel', (event) => {
      if (this.locked) this.wheel += Math.sign(event.deltaY);
    });
  }

  /** Ob der Pointer-Lock auf dem Spiel-Canvas aktiv ist. */
  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  /** Fordert den Pointer-Lock an (nur aus einer Benutzeraktion heraus erfolgreich). Fehler werden ignoriert. */
  requestLock(): void {
    if (this.locked) return;
    try {
      const result = this.canvas.requestPointerLock() as unknown;
      if (result instanceof Promise) result.catch(() => {});
    } catch {
      // z. B. ohne Benutzeraktion – dann klickt der Spieler eben ins Bild
    }
  }

  /** Gibt den Pointer-Lock frei. */
  releaseLock(): void {
    if (this.locked) document.exitPointerLock();
  }

  /** Ob die Taste gerade gehalten wird. */
  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** Ob die Taste seit dem letzten Aufruf neu gedrückt wurde (verbraucht den Tastendruck). */
  consumePress(code: string): boolean {
    return this.pressed.delete(code);
  }

  /** Gesammelte Mausbewegung seit dem letzten Aufruf (in Pixeln) und setzt sie zurück. */
  consumeMouse(): { dx: number; dy: number } {
    const result = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return result;
  }

  /** Mausrad-Schritte seit dem letzten Aufruf (+1 = nach unten) und setzt sie zurück. */
  consumeWheel(): number {
    const result = this.wheel;
    this.wheel = 0;
    return result;
  }

  /** Vergisst alle neuen Tastendrücke (z. B. beim Bildschirmwechsel). */
  clearPresses(): void {
    this.pressed.clear();
  }

  dispose(): void {
    for (const fn of this.cleanup) fn();
  }
}
