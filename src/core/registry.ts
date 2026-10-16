/**
 * Vertrag für Spielinhalte: Blöcke, Items, Rezepte und den Textur-Atlas.
 *
 * - `src/data/` (OpenCode) liefert die Inhalte und die Registry: `createRegistry(): Registry`.
 * - `src/assets/` (OpenCode) liefert den Textur-Atlas: `createTextureAtlas(): TextureAtlas | null`.
 * - Alle anderen Bereiche lesen Inhalte nur über die {@link Registry}.
 *
 * Alle Definitionen sind **reine Daten** (keine Funktionen, keine Klassen), damit sie per `postMessage`
 * an Web Worker geschickt werden können (Structured Clone).
 *
 * @module core/registry
 */

import type { BlockId, Face, ItemId } from './types';

// ---------------------------------------------------------------------------
// Blöcke
// ---------------------------------------------------------------------------

/**
 * Wie ein Block gezeichnet wird und ob er Nachbarflächen verdeckt.
 * - `opaque`: undurchsichtig. Verdeckt die angrenzenden Flächen der Nachbarn (diese werden nicht erzeugt).
 * - `cutout`: Pixel sind entweder voll sichtbar oder ganz durchsichtig (Alpha-Test), z. B. Blätter, Glas.
 *   Verdeckt keine Nachbarn. Zwischen zwei gleichen `cutout`-Blöcken darf die Fläche entfallen (Glas an Glas).
 * - `translucent`: halbdurchsichtig mit Blending, z. B. Wasser. Eigener Render-Durchgang nach den anderen.
 *   Zwischen zwei gleichen `translucent`-Blöcken entfällt die Fläche.
 * - `invisible`: wird nie gezeichnet (Luft).
 */
export type Transparency = 'opaque' | 'cutout' | 'translucent' | 'invisible';

/**
 * Geometrie eines Blocks.
 * - `cube`: voller Würfel.
 * - `liquid`: Würfel, dessen Oberseite etwas tiefer liegt (ca. 14/16), wenn darüber keine Flüssigkeit ist.
 *   Blöcke mit dieser Form gelten für die Physik als Wasser (Schwimmen) und werden vom Raycast ignoriert.
 * - `cross`: zwei sich kreuzende senkrechte Flächen (Pflanzen; derzeit unbenutzt).
 * - `torch`: dünner senkrechter Stab (2/16 breit, 10/16 hoch) in der Mitte des Blocks.
 *   Ein Renderer ohne eigenes Modell darf ihn als kleinen Würfel zeichnen.
 * - `none`: keine Geometrie (Luft).
 */
export type BlockShape = 'cube' | 'liquid' | 'cross' | 'torch' | 'none';

/** Werkzeugarten. */
export type ToolType = 'pickaxe' | 'axe' | 'shovel' | 'sword';

/** Textur-Namen (Schlüssel im {@link AtlasLayout}) für jede Seite eines Blocks. */
export type BlockTextures = Readonly<Record<Face, string>>;

/** Was ein Block beim Abbauen fallen lässt. */
export interface BlockDrop {
  /** Gedropptes Item. */
  readonly item: ItemId;
  /** Anzahl (mindestens 1). */
  readonly count: number;
  /** Wahrscheinlichkeit 0–1. Fehlt das Feld, droppt der Block immer. */
  readonly chance?: number;
}

/**
 * Definition eines Blocktyps.
 *
 * Beispiel Stein:
 * ```ts
 * { id: BLOCK.STONE, name: 'stone', displayName: 'Stein', hardness: 1.5, solid: true,
 *   transparency: 'opaque', shape: 'cube', lightLevel: 0, lightOpacity: 15, replaceable: false,
 *   color: 0x7f7f7f, textures: { top: 'stone', bottom: 'stone', north: 'stone', south: 'stone', east: 'stone', west: 'stone' },
 *   drop: { item: 'cobblestone', count: 1 }, preferredTool: 'pickaxe', requiredToolLevel: 1 }
 * ```
 */
export interface BlockDef {
  /** Numerische ID, entspricht dem Index in `Registry.blocks`. Bekannte IDs: siehe `BLOCK` in `core/blocks.ts`. */
  readonly id: BlockId;
  /** Technischer Name, eindeutig, `snake_case`. Zugleich die ItemId des Block-Items (falls es eines gibt). */
  readonly name: string;
  /** Anzeigename auf Deutsch, z. B. „Holzstamm“. */
  readonly displayName: string;
  /**
   * Härte. Grundlage der Abbauzeit (Formel: Sache der Spiellogik; Richtwert mit der Hand:
   * `hardness × 1,5` Sekunden, mit passendem Werkzeug schneller).
   * `0` = sofort abbaubar, negativ (z. B. `-1`) = unzerstörbar (Grundgestein).
   * Typische Werte: Erde 0,5 · Gras 0,6 · Holz 2 · Stein 1,5 · Erz 3 · Blätter 0,2 · Glas 0,3.
   */
  readonly hardness: number;
  /** Ob der Block für die Physik fest ist (Kollision). Wasser, Luft und Fackel: `false`. */
  readonly solid: boolean;
  /** Durchsichtigkeit, bestimmt Render-Durchgang und Flächen-Culling. */
  readonly transparency: Transparency;
  /** Geometrie. */
  readonly shape: BlockShape;
  /** Eigene Lichtstärke 0–15 (Fackel 14, sonst 0). */
  readonly lightLevel: number;
  /**
   * Wie stark der Block Licht schluckt, 0–15. Luft und Glas 0, Blätter 1, Wasser 2, undurchsichtige Blöcke 15.
   * Sonnenlicht verliert beim Durchgang so viele Stufen (mindestens jedoch die normale Abnahme seitlich).
   */
  readonly lightOpacity: number;
  /** Ob ein gesetzter Block diesen einfach ersetzt (Luft, Wasser). */
  readonly replaceable: boolean;
  /** Grundfarbe 0xRRGGBB. Wird gezeichnet, solange (oder wo) keine Textur im Atlas vorhanden ist. */
  readonly color: number;
  /** Textur-Namen je Seite, oder `null` (dann nur Farbe). */
  readonly textures: BlockTextures | null;
  /** Drop beim Abbauen, `null` = nichts (z. B. Blätter, Glas, Luft). */
  readonly drop: BlockDrop | null;
  /** Werkzeug, das den Abbau beschleunigt, oder `null`. */
  readonly preferredTool: ToolType | null;
  /**
   * Mindest-Werkzeugstufe für einen Drop. `0` = droppt immer (auch mit der Hand).
   * `> 0` = droppt nur, wenn mit `preferredTool` mindestens dieser Stufe abgebaut wird
   * (Stufen siehe {@link ToolDef.level}; Stein/Kohle: 1 = Holz, Eisenerz: 2 = Stein).
   */
  readonly requiredToolLevel: number;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/** Werkzeug-Eigenschaften eines Items. */
export interface ToolDef {
  /** Werkzeugart. */
  readonly type: ToolType;
  /** Material-Stufe: 1 = Holz, 2 = Stein, 3 = Eisen. */
  readonly level: number;
  /** Abbau-Multiplikator gegenüber der Hand für Blöcke mit passendem `preferredTool` (Holz 2, Stein 4). */
  readonly speed: number;
  /** Haltbarkeit neu (Holz 59, Stein 131). Jeder abgebaute Block kostet 1, Schwerter beim Abbauen 2. */
  readonly maxDurability: number;
  /** Schaden beim Schlagen in halben Herzen (für später, z. B. Schwert Holz 4, Stein 5). */
  readonly attackDamage: number;
}

/**
 * Definition eines Items. Jeder platzierbare Block hat ein Item mit `id === BlockDef.name` und `block === BlockDef.id`.
 */
export interface ItemDef {
  /** Eindeutige ID, `snake_case`. */
  readonly id: ItemId;
  /** Anzeigename auf Deutsch. */
  readonly displayName: string;
  /** Maximale Stapelgröße: normalerweise 64, Werkzeuge 1. */
  readonly maxStack: number;
  /** Textur-Name für das Symbol (Schlüssel im Atlas), oder `null`. Block-Items dürfen eine Blocktextur nutzen. */
  readonly icon: string | null;
  /** Ersatzfarbe 0xRRGGBB für das Symbol, falls keine Textur vorhanden ist. */
  readonly color: number;
  /** Block, der beim Rechtsklick gesetzt wird, oder `null`. */
  readonly block: BlockId | null;
  /** Werkzeug-Eigenschaften oder `null`. */
  readonly tool: ToolDef | null;
  /**
   * Brenndauer als Ofen-Brennstoff in Sekunden (z. B. Kohle 80, Holzstamm/Bretter 15, Stock 5).
   * Fehlt das Feld (oder ist es 0), taugt das Item nicht als Brennstoff.
   */
  readonly fuelSeconds?: number;
  /**
   * Nahrung: Essen (rechte Maustaste halten, 1,6 s) stellt `nutrition` halbe Hunger-Symbole wieder her;
   * `saturation` ist die versteckte Reserve, die zuerst verbraucht wird. Fehlt das Feld, ist das Item nicht essbar.
   * Beispiel Apfel: `{ nutrition: 4, saturation: 2.4 }`.
   */
  readonly food?: { readonly nutrition: number; readonly saturation: number };
}

// ---------------------------------------------------------------------------
// Rezepte
// ---------------------------------------------------------------------------

/** Ergebnis eines Rezepts. */
export interface RecipeResult {
  readonly item: ItemId;
  readonly count: number;
}

/**
 * Geformtes Rezept. Das Muster darf im Crafting-Raster beliebig verschoben und
 * waagerecht gespiegelt werden. Ein Muster bis 2×2 passt ins Inventar-Raster (2×2) und in die Werkbank (3×3),
 * größere Muster nur in die Werkbank.
 *
 * Beispiel Spitzhacke:
 * ```ts
 * { type: 'shaped', id: 'wooden_pickaxe', pattern: ['PPP', ' S ', ' S '],
 *   key: { P: 'planks', S: 'stick' }, result: { item: 'wooden_pickaxe', count: 1 } }
 * ```
 */
export interface ShapedRecipe {
  readonly type: 'shaped';
  /** Eindeutige ID des Rezepts. */
  readonly id: string;
  /** 1–3 Zeilen gleicher Länge (1–3 Zeichen). Leerzeichen = leeres Feld. */
  readonly pattern: readonly string[];
  /** Zuordnung Zeichen → Item. */
  readonly key: Readonly<Record<string, ItemId>>;
  readonly result: RecipeResult;
}

/**
 * Formloses Rezept: Die Zutaten dürfen beliebig im Raster liegen, jede Zutat genau einmal pro Eintrag.
 * Mehr als 4 Zutaten passen nur in die Werkbank.
 *
 * Beispiel Bretter: `{ type: 'shapeless', id: 'planks', ingredients: ['log'], result: { item: 'planks', count: 4 } }`
 */
export interface ShapelessRecipe {
  readonly type: 'shapeless';
  readonly id: string;
  /** Zutaten (1–9), gleiche Items dürfen mehrfach vorkommen. */
  readonly ingredients: readonly ItemId[];
  readonly result: RecipeResult;
}

/** Ein Crafting-Rezept. */
export type Recipe = ShapedRecipe | ShapelessRecipe;

/**
 * Ofen-Rezept: ein Stück `input` wird in `seconds` Sekunden zu `result`.
 * Beispiel: `{ id: 'iron_ingot', input: 'iron_ore', result: { item: 'iron_ingot', count: 1 }, seconds: 10 }`
 */
export interface SmeltingRecipe {
  /** Eindeutige ID des Rezepts. */
  readonly id: string;
  /** Zutat (genau ein Stück pro Vorgang). */
  readonly input: ItemId;
  readonly result: RecipeResult;
  /** Dauer eines Vorgangs in Sekunden (Standard 10). */
  readonly seconds: number;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Zentrale, unveränderliche Sammlung aller Inhalte. Wird einmal beim Start mit `createRegistry()`
 * aus `src/data/` erzeugt und an alle Bereiche weitergegeben.
 */
export interface Registry {
  /**
   * Alle Blöcke, dicht nach ID sortiert: `blocks[id].id === id`. `blocks[0]` ist Luft.
   * Lücken (unbelegte IDs) sind nicht erlaubt; sie werden mit Platzhalter-Definitionen gefüllt.
   * Dieses Array ist reine Daten und darf an Worker geschickt werden.
   */
  readonly blocks: readonly BlockDef[];
  /** Alle Items (inklusive Block-Items). */
  readonly items: readonly ItemDef[];
  /** Alle Crafting-Rezepte. */
  readonly recipes: readonly Recipe[];
  /** Alle Ofen-Rezepte (leer, solange es keine gibt). */
  readonly smelting: readonly SmeltingRecipe[];
  /** Alle Textur-Namen, die Blöcke und Items verwenden (ohne Duplikate). Grundlage für den Atlas. */
  readonly textureNames: readonly string[];

  /**
   * Definition zu einer Block-ID. Unbekannte IDs liefern eine Platzhalter-Definition
   * (fest, undurchsichtig, magenta, Name `"unknown"`) – nie `undefined`.
   */
  getBlockDef(id: BlockId): BlockDef;
  /** Definition zu einem technischen Blocknamen, oder `undefined`. */
  getBlockDefByName(name: string): BlockDef | undefined;
  /** Definition zu einer ItemId, oder `undefined`. */
  getItemDef(id: ItemId): ItemDef | undefined;
}

/** Signatur der Fabrik, die `src/data/index.ts` als `createRegistry` exportiert. */
export type CreateRegistry = () => Registry;

// ---------------------------------------------------------------------------
// Textur-Atlas
// ---------------------------------------------------------------------------

/**
 * Rechteck einer Textur im Atlas, in normierten Koordinaten 0–1.
 * `u` wächst nach rechts, `v` wächst **nach unten** (wie Bildkoordinaten, Ursprung links oben).
 * Der Renderer lädt das Atlas-Bild deshalb mit `texture.flipY = false`.
 * Für Pixelgrafik: `magFilter = NearestFilter`, keine Mipmaps oder nur mit Rand-Padding.
 */
export interface UVRect {
  /** Linker Rand. */
  readonly u0: number;
  /** Oberer Rand. */
  readonly v0: number;
  /** Rechter Rand. */
  readonly u1: number;
  /** Unterer Rand. */
  readonly v1: number;
}

/**
 * Aufbau des Atlas – reine Daten, darf an Worker geschickt werden (Meshing braucht nur das Layout, nicht das Bild).
 */
export interface AtlasLayout {
  /** Kantenlänge einer Kachel in Pixeln (16). */
  readonly tileSize: number;
  /** Breite des Atlas-Bilds in Pixeln. */
  readonly width: number;
  /** Höhe des Atlas-Bilds in Pixeln. */
  readonly height: number;
  /**
   * Textur-Name → UV-Rechteck. Fehlt ein Name, zeichnen Welt und Oberfläche stattdessen die Farbe
   * aus `BlockDef.color` bzw. `ItemDef.color`.
   */
  readonly regions: Readonly<Record<string, UVRect>>;
}

/** Fertiger Textur-Atlas: Layout plus Bild. */
export interface TextureAtlas {
  readonly layout: AtlasLayout;
  /** Das Bild mit allen Kacheln (RGBA, durchsichtige Pixel für Löcher in Blättern/Glas). */
  readonly image: HTMLCanvasElement | OffscreenCanvas;
}

/**
 * Signatur der Fabrik, die `src/assets/index.ts` als `createTextureAtlas` exportiert.
 * Erzeugt alle Texturen prozedural und deterministisch (immer gleiches Ergebnis).
 * `null` = (noch) kein Atlas, alle Bereiche zeichnen dann Farben.
 */
export type CreateTextureAtlas = () => TextureAtlas | null;
