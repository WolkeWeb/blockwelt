/**
 * Winzige DOM-Helfer für die Oberfläche.
 *
 * @module ui/dom
 */

/** Erzeugt ein Element mit Klasse und optionalem Text. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Registriert einen Listener und gibt die Abmeldefunktion zurück. */
export function on<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
): () => void {
  target.addEventListener(type, handler);
  return () => target.removeEventListener(type, handler);
}

/** Erzeugt einen Knopf. */
export function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', (event) => {
    event.preventDefault();
    onClick();
  });
  return node;
}

/** Erzeugt ein beschriftetes Eingabefeld. */
export function field(labelText: string, control: HTMLElement): HTMLElement {
  const wrapper = el('div', 'bw-field');
  const label = el('label', undefined, labelText);
  wrapper.append(label, control);
  return wrapper;
}

/** Setzt `display` eines Elements (`true` → Standardwert). */
export function setVisible(node: HTMLElement, visible: boolean): void {
  node.style.display = visible ? '' : 'none';
}

/** Übersetzt eine Farbe (0xRRGGBB) in `#rrggbb`. */
export function hexColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Baut eine Liste von Zahlen (z. B. Fallschaden) zu einem lesbaren Text. */
export function formatNumber(value: number, digits = 1): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}
