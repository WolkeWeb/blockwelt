/**
 * Abbauzeit und Drops: Wie lange dauert es, einen Block mit einem bestimmten Werkzeug abzubauen,
 * und was fällt dabei heraus?
 */
import type { BlockDef, GameMode, ItemStack, ToolDef } from '../core';

/** Faktor der Abbauzeit pro Härte-Punkt (Sekunden). */
const SECONDS_PER_HARDNESS = 1.5;
/** Wer einen Block ohne das nötige Werkzeug abbaut, braucht deutlich länger. */
const WRONG_TOOL_SECONDS_PER_HARDNESS = 5;

/** Ob das Werkzeug zum bevorzugten Werkzeug des Blocks passt. */
export function isPreferredTool(block: BlockDef, tool: ToolDef | null): boolean {
  return tool !== null && block.preferredTool !== null && tool.type === block.preferredTool;
}

/**
 * Ob der Block mit diesem Werkzeug seinen Drop fallen lässt.
 * `requiredToolLevel` 0 = immer; sonst muss das bevorzugte Werkzeug mit genügend hoher Stufe benutzt werden.
 */
export function canHarvest(block: BlockDef, tool: ToolDef | null): boolean {
  if (block.requiredToolLevel <= 0) return true;
  return isPreferredTool(block, tool) && tool !== null && tool.level >= block.requiredToolLevel;
}

/**
 * Abbauzeit in Sekunden.
 * - Härte < 0 (Grundgestein): `Infinity`.
 * - Kreativ oder Härte 0: sofort (0).
 * - Sonst `Härte × 1,5 s`, mit passendem Werkzeug geteilt durch dessen `speed`,
 *   ohne das nötige Werkzeug (Drop nicht möglich) `Härte × 5 s`.
 */
export function breakSeconds(block: BlockDef, tool: ToolDef | null, mode: GameMode): number {
  if (block.hardness < 0) return Number.POSITIVE_INFINITY;
  if (mode === 'creative' || block.hardness === 0) return 0;
  const perHardness = canHarvest(block, tool) ? SECONDS_PER_HARDNESS : WRONG_TOOL_SECONDS_PER_HARDNESS;
  const speed = isPreferredTool(block, tool) && tool ? tool.speed : 1;
  return (block.hardness * perHardness) / speed;
}

/** Abbauzeit in ganzen Ticks (mindestens 1). */
export function breakTicks(seconds: number, ticksPerSecond: number): number {
  if (!Number.isFinite(seconds)) return Number.POSITIVE_INFINITY;
  return Math.max(1, Math.ceil(seconds * ticksPerSecond));
}

/**
 * Würfelt den Drop eines Blocks aus.
 * @param random Zufallsquelle 0–1 (in Tests austauschbar).
 * @returns Gedropptes Item oder `null` (kein Drop, Pech beim Würfeln).
 */
export function rollDrop(block: BlockDef, random: () => number = Math.random): ItemStack | null {
  const drop = block.drop;
  if (!drop || drop.count < 1) return null;
  if (drop.chance !== undefined && random() >= drop.chance) return null;
  return { item: drop.item, count: drop.count };
}
